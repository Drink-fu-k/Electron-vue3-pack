import Dexie, { Table } from 'dexie';

// 服务器表
interface sshInfo {
  type: number;
  host: string;
  port: number;
  username: string;
  password: string
}

class sshClassDexie extends Dexie {
  sshInfo!: Table<sshInfo>;

  constructor() {
    super('sshDatabase');
    this.version(1).stores({
      sshInfo: '++id' // Primary key and indexed props
    });
  }
}
const sshdb = new sshClassDexie();
sshdb.open()

// 获取服务器信息
export function getsshInfo(func) {
  sshdb.table('sshInfo').toArray().then(data => {
    func(data)
  })
}
// 增加服务器信息
export function addSSH(obj) {
  let res = Object.assign({}, obj);
  sshdb.sshInfo.put(res);
}
// 删除服务器信息
export function deleteSSH(id) {
  sshdb.sshInfo.delete(id)
}

// 查询项目
export function hasSshInfo(id, func) {
  sshdb.sshInfo.get(id).then(data => {
    func(data)
  })
}