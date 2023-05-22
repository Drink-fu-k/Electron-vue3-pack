import { BrowserWindow, ipcMain } from "electron";
import { notificationFn, clientSSH } from "@main/utils/index"
import shell from 'shelljs';
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
  notificationFn("提示", '打包完成');
}

const Shell = async (mainWindow, res, remoteConfig) => {
  let { remotePath, remoteName } = res
  clientSSH(remoteConfig, conn => {
    mainWindow.webContents.send('pipMsg', '解压缩')
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
        notificationFn("提示", `${code == 0 ? '上传成功' : '上传失败'}`);
        conn.end()
      });
    })
  })

}

const startSSH = async (project, remoteConfig, mainWindow) => {
  let { remoteName, localPath } = project
  if (!remoteConfig) return (mainWindow.webContents.send('pipMsg', '请配置服务器信息'), mainWindow.webContents.send('packMsg', false))
  clientSSH(remoteConfig, conn => {
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
  })
}


export function usePrintHandle() {
  ipcMain.handle("pack", (event, res) => {
    let mainWindow = BrowserWindow.fromWebContents(event.sender)
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
  });

  ipcMain.handle("public", (event, project, ssh) => {
    let mainWindow = BrowserWindow.fromWebContents(event.sender)
    project = JSON.parse(project);
    ssh = JSON.parse(ssh);
    startSSH(project, ssh, mainWindow)
  });

  ipcMain.handle("publicProd", (event, project, sshInfo) => {
    let mainWindow = BrowserWindow.fromWebContents(event.sender)
    project = JSON.parse(project);
    Object.values(sshInfo).forEach(async ssh => {
      await startSSH(project, ssh, mainWindow)
    })
  });
}