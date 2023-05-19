// 这里是定义菜单的地方，详情请查看 https://electronjs.org/docs/api/menu

const menu = [
  {
    label: '设置',
    submenu: [{
      label: '快速重启',
      accelerator: 'F5',
      role: 'reload'
    }, {
      label: '开发者工具',
      accelerator: 'F12',
      role: 'toggledevtools'
    }
      , {
      label: '退出',
      accelerator: 'CmdOrCtrl+F4',
      role: 'close'
    }]
  }]

export default menu
