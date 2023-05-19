import { BrowserWindow, ipcMain, WebContentsPrintOptions } from "electron";
import { IsUseSysTitle } from "../config/const";
import { otherWindowConfig } from "../config/windowsConfig";
import { printURL } from "@main/config/StaticPath";

import shell from 'shelljs';
import ssh2 from 'ssh2';
import archiver from 'archiver';
import fs from 'fs'


const buildFunc = (res, mainWindow) => {
  let { remoteName, localPath } = res
  const output = fs.createWriteStream(`${localPath}/${remoteName}.tar`);
  const archive = archiver('tar');// 设置压缩等级
  archive.pipe(output);
  archive.directory(`${localPath}/dist`, false);
  archive.finalize();
  mainWindow.webContents.send('pipMsg', '压缩完成')
  mainWindow.webContents.send('packMsg', true)
}

const Shell = async (mainWindow, res, remoteConfig) => {
  const conn = new ssh2.Client();
  let { remotePath, remoteName } = res
  mainWindow.webContents.send('pipMsg', '解压缩')
  conn.on('ready', async function () {
    conn.shell(function (err, stream) {
      if (err) return mainWindow.webContents.send('pipMsg', '上传失败' + err)
      stream.write(`sudo -i\r\n`);
      stream.write(`cd ${remotePath}/\r\n`);
      stream.write(`tar -xvf ${remoteName}.tar\r\n`)
      stream.write(`rm -f ${remoteName}.tar\r\n`)
      stream.write(`cp -r /home/hcadmin/${remoteName} /home/qkldev/projects\r\n`);
      stream.write(`exit\r\n`);
      stream.write(`exit\r\n`);
      stream.stderr.on('data', data => {
        mainWindow.webContents.send('pipMsg', `STDERR: ${data}`);
      })
      stream.stdout.on('data', data => {
        mainWindow.webContents.send('pipMsg', `STDOUT: ${data}`);
      })
      stream.on('close', function (code, signal) {
        mainWindow.webContents.send('pipMsg', `${code == 0 ? '上传成功' : '上传失败'}`)
        mainWindow.webContents.send('packMsg', code == 0)
        conn.end()
      });
    })

  }).connect(remoteConfig);

}

const startSSH = async (project, remoteConfig, mainWindow) => {
  let { remoteName, localPath } = project
  const conn = new ssh2.Client();
  if (!remoteConfig) return (mainWindow.webContents.send('pipMsg', '请配置服务器信息'), mainWindow.webContents.send('packMsg', false))
  conn.on('ready', async function () {
    mainWindow.webContents.send('pipMsg', '连接成功')
    mainWindow.webContents.send('pipMsg', '上传中....')
    const zip = `${localPath}/${remoteName}.tar` // 本地压缩包地址
    const webZip = `${remoteName}/${remoteName}.tar` // 线上地址
    conn.sftp((err, SFTP) => {
      SFTP.fastPut(zip, webZip, {}, (err, result) => {
        //上传完成后开始解压
        if (err) {
          mainWindow.webContents.send('pipMsg', '上传hcadmin失败')
          conn.end();
        }
        mainWindow.webContents.send('pipMsg', '上传hcadmin成功')
        conn.end()
        Shell(mainWindow, project, remoteConfig)
      })
    })

  }).connect(remoteConfig);
}


export function usePrintHandle() {
  ipcMain.handle("getPrinters", async (event) => {
    return await event.sender.getPrintersAsync();
  });

  ipcMain.handle(
    "printHandlePrint",
    async (event, options: WebContentsPrintOptions) => {
      return new Promise((resolve) => {
        event.sender.print(
          options,
          (success: boolean, failureReason: string) => {
            resolve({ success, failureReason });
          }
        );
      });
    }
  );

  ipcMain.handle("openPrintDemoWindow", () => {
    openPrintDemoWindow();
  });


  ipcMain.handle("pack", (event, res) => {
    let mainWindow = BrowserWindow.fromWebContents(event.sender)
    // database.hasProject({ _id }, async (res) => {
    res = JSON.parse(res);
    let { localPath, command } = res;
    const workerProcess = shell.exec(command, { cwd: localPath, async: true });
    workerProcess.stdout.on('data', function (data) {
      mainWindow.webContents.send('pipMsg', data)
    })
    // 打印错误的后台可执行程序输出
    workerProcess.stderr.on('data', function (data) {
      mainWindow.webContents.send('pipMsg', data)
    })

    // 退出之后的输出
    workerProcess.on('close', async function (code) {
      mainWindow.webContents.send('pipMsg', '打包完成')
      buildFunc(res, mainWindow);
    })
    // })
  });

  ipcMain.handle("public", (event, project, ssh) => {
    let mainWindow = BrowserWindow.fromWebContents(event.sender)
    // database.hasProject({ _id }, res => )
    project = JSON.parse(project);
    ssh = JSON.parse(ssh);
    startSSH(project, ssh, mainWindow)
  });



}

let win: BrowserWindow;
export function openPrintDemoWindow() {
  if (win) {
    win.show();
    return;
  }
  win = new BrowserWindow({
    titleBarStyle: IsUseSysTitle ? "default" : "hidden",
    ...Object.assign(otherWindowConfig, {}),
  });
  win.loadURL(printURL);
  win.on("ready-to-show", () => {
    win.show();
  });
  win.on("closed", () => {
    win = null;
  });
}
