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

const Shell = async ({ mainWindow, project, remoteConfig, type = 0 }) => {
  return new Promise((resolve, reject) => {
    let { remotePath, remoteName } = project
    let remoteServerPath = type == 0 ? '/home/qkldev/projects' : '/mnt/data/projects'
    let remote_Path = type == 0 ? remotePath : remotePath.replace('hcadmin', 'hcblockchain')
    clientSSH(remoteConfig, conn => {
      mainWindow.webContents.send('pipMsg', '解压缩')
      conn.shell(function (err, stream) {
        if (err) return (mainWindow.webContents.send('pipMsg', '上传失败' + err), conn.end())
        stream.write(`sudo -i\r\n`);
        stream.write(`cd ${remote_Path}/\r\n`);
        stream.write(`tar -xvf ${remoteName}.tar\r\n`)
        stream.write(`rm -f ${remoteName}.tar\r\n`)
        stream.write(`cp -r ${remote_Path} ${remoteServerPath}\r\n`);
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
          resolve()
        });
      })
    })
  })

}

const startSSH = async ({ project, remoteConfig, mainWindow, type = 0 }) => {
  return new Promise((resolve, reject) => {
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
            mainWindow.webContents.send('pipMsg', '上传失败，请重新上传')
            conn.end();
            resolve(false)
            return
          }
          mainWindow.webContents.send('pipMsg', '上传中转服务器成功')
          conn.end()
          resolve(true)
        })
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
      mainWindow.webContents.send('pipMsg', code == 0 ? '打包完成' : '打包失败')
      buildFunc(res, mainWindow)
    })
  });

  ipcMain.handle("public", async (event, project, ssh) => {
    let mainWindow = BrowserWindow.fromWebContents(event.sender)
    project = JSON.parse(project);
    let remoteConfig = JSON.parse(ssh);
    let isNext = await startSSH({ project, remoteConfig, mainWindow })
    if (isNext) Shell({ mainWindow, project, remoteConfig })
  });

  ipcMain.handle("publicProd", async (event, project, sshInfo) => {
    let mainWindow = BrowserWindow.fromWebContents(event.sender)
    project = JSON.parse(project);
    let sshInfoArr = Object.values(sshInfo)
    for (const remoteConfig of sshInfoArr) {
      //   // type 0:测试环境 1：正式环境
      await startSSH({ project, remoteConfig, mainWindow, type: 1 })
      await Shell({ mainWindow, project, remoteConfig, type: 1 })
    }
  });
}