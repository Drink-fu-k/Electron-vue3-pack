import { Notification } from "electron";
import ssh2 from 'ssh2';
// 系统消息弹窗
export const notificationFn = (title, body) => {
  const isAllowed = Notification.isSupported();
  if (isAllowed) {
    const options = {
      title,
      body,
      silent: true, // 系统默认的通知声音
    }
    const notification = new Notification(options);
    notification.show();
  }
}

// 连接ssh方法
export const clientSSH = (remoteConfig, func) => {
  const conn = new ssh2.Client();
  try {
    conn.on('ready', async function () {
      func(conn)
    }).connect(remoteConfig);
  } catch (error) {
    notificationFn('提示', '请检查服务器信息')
  }

}