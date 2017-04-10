/*
 * config.js
 *
 * Copyright (c) 2016-2017 ALSENET SA - http://www.alsenet.com
 *
 * Author(s):
 *
 *      Rurik Bogdanov <rurik.bugdanov@alsenet.com>
 *
 * This file is part of the electron-dataminer project at:
 *
 *      <http://github.com/alsenet-labs/electron-dataminer>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Additional Terms:
 *
 *      You are required to preserve legal notices and author attributions in
 *      that material or in the Appropriate Legal Notices displayed by works
 *      containing it.
 *
 */

var htmlToText=require('html-to-text');
var querystring=require('querystring');
var sanitize=require('sanitize-filename');
var path=require('path');
var fs=require('fs');

var config={
  devTools: false,
  consoleRedirect: true,

  browserWindow: {
    show: true,
    width: 1024,
    height: 768
  },

  url: `file://${__dirname}/index.html`,

  webviews: {
    webview1:  {
      pageClass: 'duckduckgo',
      url: 'https://duckduckgo.com',
      devTools: false
    },

    webview2: {
      url: 'about:blank',
      pageClass: 'content',
      devTools: false
    }
  },

  pageClass: {
    duckduckgo: {
      webview: {
        ipcEvents: {
          processPage: function duckduckgo_webview_processPage(event,options){
            // get first search result
            var href=$$$('a.result__a:first').attr('href');
            if (href) {
              // send result to renderer
              event.sender.sendToHost('processSearchResult',{
                electron: options.electron,
                href: href,
                query: querystring.parse(window.location.search.substr(1)).q
              });

            } else {
              // click on 'load more'
              var more=$$$('.result--more a');
              if (more.length) {
                more.click();
                // should wait for something instead of only delay
                setTimeout(function(){
                  duckduckgo_webview_processPage(event,options);
                },10000);
              }
            }
          },

          // remove first search result from webview1
          shift: function(event,options) {
            $$$('a.result__a:first').closest('div').remove();
          }
        },

      },
      renderer: {
        ipcEvents: {
          // receive search result from webview.processPage event handler
          processSearchResult: function(event,options){
            var data=event.args[0];
            var href=data.href;
            webview1.query=data.query;

            // send query to webContents
            var ipcRenderer=electron.ipcRenderer;
            global.query=data.query;
            ipcRenderer.send('query',data.query);

            // open url in webview2
            webview2.src=href;
            console.log('opening '+href);

            // force webview2.processPage event after 30sec
            webview2.timeout=setTimeout(function(){
              console.log('timeout');
              webview2.send('processPage',config.webviews.webview2);
            },30000);
          }
        }
      }

    }, // duckduckgo

    // webview2 event handlers
    content: {
      main: {
        webContents: {
          'ipc-message': function(event,args){
//            console.log('IPCMESSAGE',event,args);
            if (args[0]=='query') global.query=args[1];
          },
        },
        session: {
          'will-download': function(event, item, webContents) {
            mainWindow.webContents.send('clearTimeout');
  //          console.log('GLOBAL',global.query);
            var url=item.getURL();
            var hostname=url.match(/:\/\/([^\/]+)\//)[1];
            var basename=path.basename(url);
            var savePath=path.join(config.savePath||__dirname, sanitize(global.query.replace(/ /g,'_')+'-'+Date.now()+'-'+hostname+'-'+basename));
            var tempPath=savePath+'.crdownload';
            item.setSavePath(tempPath);
            item.on('updated', function(){
              var frac=item.getReceivedBytes()/(item.getTotalBytes()+1);
        //      console.log(Math.round(frac*100));
        //      mainWindow.setProgressBar(frac);
        //      mainWindow.webContents.send('progress_download',{total:item.getTotalBytes(),frac:frac});
            })
            item.on('done', function(e, state) {
              //mainWindow.setProgressBar(-1);
              if (state === 'completed') {
                console.log('Download successfully '+savePath);
                mainWindow.webContents.send('downloadSuccess',url);
                try {
                  if (!fs.existsSync(savePath) && fs.existsSync(tempPath)) {
                    fs.renameSync(tempPath,savePath);
                  }
                } catch(e) {
                  console.log(e);
                }

              } else {
                console.log('Download is cancelled or interrupted that can\'t be resumed',savePath);
                mainWindow.webContents.send('downloadFailure',url);
              }
            });
          }
        }
      },

      webview: {
        ipcEvents: {
          processPage: function(event,options) {
            var text='';
            // check for our jQuery or another
            var $$$=$$$||window.jQuery;
            if (!$$$) {
              if (window.location.href!='about:blank') {
                // probably timeout
                text='***problem***\n';
              }

            } else {
              // convert to text, without the scripts
              var html=document.body.parentElement.outerHTML;
              text+=htmlToText.fromString(html,{
                wordwrap: false,
                ignoreHref: true,
                ignoreImage: true
              });
            }
            event.sender.sendToHost('saveContent',{
              host: window.location.hostname,
              href: window.location.href,
              text: text
            });
          }
        }
      },

      renderer: {
        ipcEvents: {
          clearTimeout: function() {
            clearTimeout(webview2.timeout);
          },

          downloadSuccess: function(){
            webview1.send('shift',config.webviews.webview1);
            process.nextTick(function(){
              webview1.send('processPage',config.webviews.webview1);
            });
          },

          downloadFailure: function(){
            webview1.send('shift',config.webviews.webview1);
            process.nextTick(function(){
              webview1.send('processPage',config.webviews.webview1);
            });
          },

          // save the text sent from webview1
          saveContent: function(event,options) {
            clearTimeout(webview2.timeout);
            var data=event.args[0];
            if (data.text.length) {
              // filename is <querystring>-<timestamp>-<hostname>.txt
              var filename=webview1.query.replace(/ /g,'_')+'-'+Date.now()+'-'+data.host+'.txt'
              require('fs').writeFile(
                sanitize(filename),
                // first line is href
                data.href+'\n'+data.text,
                function(err){
                  if (err) {
                    console.log(err);
                  }
                  nextLink();
                }
              );
            } else {
              nextLink();
            }
            function nextLink() {
              webview1.send('shift',config.webviews.webview1);
              process.nextTick(function(){
                webview1.send('processPage',config.webviews.webview1);
              });
            }
          }
        }
      }

    } // content
  } // pageClass
} // config

module.exports=config;
