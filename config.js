var htmlToText=require('html-to-text');
var querystring=require('querystring');
var sanitize=require('sanitize-filename');

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
			webview: {
				ipcEvents: {
					processPage: function(event,options) {
            var text='';
            // check for our jQuery or another
            var $$$=$$$||window.jQuery;
            if (!$$$) {
              if (window.location.href!='about:blank') {
                // probably timeout
                text='problem';
              }

            } else {
              // convert to text, without the scripts
              var html=$$$('html').html()
              text=htmlToText.fromString(html,{
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
