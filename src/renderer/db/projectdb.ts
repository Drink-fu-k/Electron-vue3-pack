import Dexie, { Table } from 'dexie';

// 项目表
interface projectList {
  name: string;
  remoteName: string;
  remotePath: string;
  localPath: string;
  command: string;
}

class MySubClassedDexie extends Dexie {
  projectList!: Table<projectList>;

  constructor() {
    super('projectDatabase');
    this.version(1).stores({
      projectList: '++id' // Primary key and indexed props
    });
  }
}
const db = new MySubClassedDexie();
db.open();

// 添加项目
export function addProject(obj) {
  let res = Object.assign({}, obj);
  db.projectList.put(res);
};
// 获取全部项目
export function getProject(func) {
  db.table('projectList').toArray().then(res => {
    func(res)
  })
}

// 删除项目
export function deleteProject(id) {
  db.projectList.delete(id)
}

// 查询项目
export function hasProject(id, func) {
  db.projectList.get(id).then(data => {
    func(data)
  })
}