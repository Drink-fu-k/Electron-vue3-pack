import { BrowserWindow, ipcMain, dialog } from "electron";
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
          // 上传完成后开始解压
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

const checkProjectFn = (currnetPath, mainWindow) => {
  shell.exec('npm ls -g eslint', (err, stdout, stderr) => {
    if (stdout.indexOf('empty') > -1) {
      shell.exec('npm i eslint -g', { async: true });
    }
    const checkProcess = shell.exec(`eslint --ext .js,.vue ${currnetPath} -f html`, { async: true })
    checkProcess.stdout.on('data', data => {
      mainWindow.webContents.send('checkMsg', data);
    })
    // 打印错误的后台可执行程序输出
    checkProcess.stderr.on('data', function (data) {
      mainWindow.webContents.send('checkMsg', data)
    })
    checkProcess.on('close', (code) => {
      mainWindow.webContents.send('checkDone');
    })
  });

}

export function usePrintHandle() {
  ipcMain.handle('checkFile', (event, localpath, type) => {
    let mainWindow = BrowserWindow.fromWebContents(event.sender)
    let properties = ['openFile', 'multiSelections']
    type == 0 && properties.push('openDirectory')

    dialog.showOpenDialog({ properties, defaultPath: localpath }).then(res => {
      let { filePaths, canceled } = res
      if (canceled) return mainWindow.webContents.send('checkDone');
      checkProjectFn(filePaths.join(' '), mainWindow)
    })
  })
  // 代码打包
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
      mainWindow.webContents.send('pipMsg', code === 0 ? '打包完成' : '打包失败')
      if (code === 0) {
        buildFunc(res, mainWindow)
        return
      }
      mainWindow.webContents.send('packMsg', true)
      notificationFn("提示", '打包失败');
    })
  });
  // 项目发布
  ipcMain.handle("public", async (event, project, ssh) => {
    let mainWindow = BrowserWindow.fromWebContents(event.sender)
    project = JSON.parse(project);
    let remoteConfig = JSON.parse(ssh);
    let isNext = await startSSH({ project, remoteConfig, mainWindow })
    if (isNext) Shell({ mainWindow, project, remoteConfig })
  });
  // 项目正式环境发布
  ipcMain.handle("publicProd", async (event, project, sshInfo) => {
    let mainWindow = BrowserWindow.fromWebContents(event.sender)
    project = JSON.parse(project);
    let sshInfoArr = Object.values(sshInfo)
    for (const remoteConfig of sshInfoArr) {
      // type 0:测试环境 1：正式环境
      await startSSH({ project, remoteConfig, mainWindow, type: 1 })
      await Shell({ mainWindow, project, remoteConfig, type: 1 })
    }
  });
  ipcMain.handle('runProject', (e, localPath) => {
    let script = fs.readFileSync(`${localPath}/package.json`, 'utf-8')
    script = JSON.parse(script)
    let cmd = 'npm run dev';
    for (const key in script) {
      if (key === 'scripts') {
        let obj = Object.keys(script[key]).find(item => ['dev', 'serve',].includes(item))
        if (obj) cmd = `npm run ${obj}`
      }
    }
    shell.exec(`start ${cmd}`, { cwd: localPath, async: true })
  })
}