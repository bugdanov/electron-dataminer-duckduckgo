var config={

  // Show chrome developer tools for main window
  //devTools: true,

  // Redirect console in terminal. Not recommended when using devTools because
  // the real line numbers becomes obfuscated for messages in the console
  // consoleRedirect: false

  // Configure the main browserWindow
  // You can hide the main browser window with options show: false,
  // but to run "headless" you need something like Xvfb or Xvnc
  browserWindow: {
//  show: false,
    width: 1024,
    height: 768
  },

  url: `file://${__dirname}/index.html`,

  // Configure webviews
  webviews: {

    // The webview DOM element id
    webview1:  {

      // you can set optional webview attributes below eg:
      attr: {
//        partition: 'persist:webview1'
      },

      // The pageClass module name for this webview
      // (will be stored in config.pageClass['my-page'])
      pageClass: 'duckduckgo',

      /*
       For example if you declare:
         pageClass: 'mypage',
       then electron-dataminer will try to load:
         1. A module named __dirname/page/mypage.js (see electron-dataminer-test/page/my-page.js)
         2. A module named electron-dataminer-mypage (see package electron-dataminer-mypage)
         3. A module named mypage (figure it out)
       the module should export a function returning the module exports (see page/my-page.js below)

       The same rules apply for the "my-api" module declared below
      */

      // The api module name for this webview
      // (will be stored in config.api['my-api'])
      // api: 'my-api',

      // The url to load in the webview
      // (Can be overriden by the pageClass or api module with the value
      // returned by optional function <module>.renderer.loadURL())
      url: 'https://duckduckgo.com',
      /*
       When the url above is loaded in the webview, the webview process will send
       a 'processPage' event to the renderer process which can be
       handled in the pageClass or/and api module (module.exports.ipcEvents.processPage)
       Code specific to a page class may override code specific to the type of data to mine,
       so the event handler for the page is called first.
      */

      //devTools: true,

      // webcontents.loadURL_options
      loadURL_options: {
        // see https://github.com/electron/electron/blob/master/docs/api/web-contents.md#webcontentsloadurlurl-options
      }

      // You can add here any other option specific to this webview to be used
      // by the pageClass or the api modules

    },

		webview2: {
			url: 'about:blank',
			pageClass: 'content',
			//devTools: true
		}

  },

  pageClass: {
    // pageClass modules specified in the webview options will be stored here.
    // You could require (but should not define) page classes here

    // webview1 event handlers
    duckduckgo: {
      webview: {
        ipcEvents: {
          processPage: function duckduckgo_webview_processPage(event,options){
            // get first search result
            var href=$$$('a.result__a:first').attr('href');
            if (href) {
              // send result to renderer
              event.sender.sendToHost('href',href);
            } else {
              // click on 'load more'
              var more=$$$('.result--more a');
              if (more.length) {
                more.click();
                // should wait for something instead of only delay
                setTimeout(function(){
                  duckduckgo_webview_processPage(event,options);
                },30000);
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
          href: function(event,options){
            var href=event.args[0];
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
		},

    // webview2 event handlers
		content: {
			webview: {
				ipcEvents: {
					processPage: function(event,options) {
            var text;
            // check for our jQuery or another
            var $$$=$$$||window.jQuery;
            if (!$$$) {
              // probably timeout
              text='problem';

            } else {
              // convert to text, without the scripts
              var body=$$$('body').clone();
              $$$('script',body).remove();
              text=body.text();
            }
            event.sender.sendToHost('saveContent',{
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
              // filename is timestamp
              var filename=Date.now()+'.txt'
              require('fs').writeFile(
                filename,
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
    }
  },

  api: {
    // api modules specified in the webview options will be stored here.
    // You could require (but should not define) apis here
  }


}

module.exports=config;
