
var path=require('path');
var fs=require('fs');
var edm=require('electron-dataminer');
var sanitize=require('sanitize-filename');

edm.mainWindow
.then(function(mainWindow){
/*  var query;
  mainWindow.webContents.on('ipc-message',function(event,args){
		console.log('IPCMESSAGE',event,args);
    if (args[0]=='query') query=args[1];
  });
  if (false)
  mainWindow.webContents.session.on('will-download', function(event, item, webContents) {
    var url=item.getURL();
    var hostname=url.match(/:\/\/([^\/]+)\//)[1];
    var basename=path.basename(url);
    console.log('item',item);
    var savePath=sanitize(path.join(edm.config.savePath||__dirname, query+'-'+Date.now()+'-'+hostname+'-'+basename));
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

  });
*/
})
.done();
