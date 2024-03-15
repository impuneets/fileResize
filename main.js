const path = require('path')
const os = require('os')
const fs = require('fs')
const {app, BrowserWindow,Menu,ipcMain, shell} =require('electron')
const ResizeImg = require('resize-img')
process.env.NODE_ENV = 'production'
const isDev = process.env.NODE_ENV !== 'production'
const isMac = process.platform === 'darwin';

let mainWindow;

//Create the main window
function createMainWindow(){
     mainWindow = new BrowserWindow({
        'title':'Image Resizer',
        width:isDev ?1000: 500,
        height:600,
        webPreferences:{
            contextIsolation:true,
            nodeIntegration:true,
            preload:path.join(__dirname,'preload.js')
        }
    })

    // Open devtools if dev environment
    if(isDev){
        mainWindow.webContents.openDevTools()
    }
    mainWindow.loadFile(path.join(__dirname,'./renderer/index.html'));
}

//Create About Window
function createAboutWindow(){
    const aboutWindow = new BrowserWindow({
        'title':'About Image Resizer',
        width:300,
        height:300
    })

    aboutWindow.loadFile(path.join(__dirname,'./renderer/about.html'));

}

//App is ready
app.whenReady().then(()=>{
    createMainWindow();

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu)

    // remove main window from memory on close
    mainWindow.on('closed',()=>(mainWindow=null))
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
      })
    })

    const menu = [
        ...(isMac ? [{
            label: app.name,
            submenu:[
                {
                    label:'About',
                    click:createAboutWindow
                }
            ]
        }]:[]),
        {
           role:'fileMenu'
        },
        ...(!isMac ? [{
            label:'Help',
            submenu:[{
                label:'About',
                click:createAboutWindow

            }]
        }]:[])
    ]
//respond to ipcRenderer resize

ipcMain.on('image:resize',(e, options)=>{
    options.dest = path.join(os.homedir(),'resizedImage')
    resizeImage(options)
})

//resize the image function

async function resizeImage({imgPath,width,height,dest}){
    try{
        const newPath = await ResizeImg(fs.readFileSync(imgPath),{
            width:+width,
            height:+height
        })
        //create filename
        const filename = path.basename(imgPath)
        //Create dest folder if not exists
        if(!fs.existsSync(dest)){
            fs.mkdirSync(dest)
        }
        //write to file dest
        fs.writeFileSync(path.join(dest,filename),newPath)

        //send success to renderer
        mainWindow.webContents.send('image:done')

        //Open dest folder
        shell.openPath(dest)
    }catch (error){
console.log(error);
    }
}

app.on('window-all-closed',()=>{
    if(!isMac){
        app.quit()
    }
})
