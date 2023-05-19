<template>
  <div id="wrapper">
    <el-card class="box-card">
      <template #header>
        <div class="card-header flex-between">
          <span>项目列表</span>
          <div>
            <el-button class="button" type="primary" @click="dialogFormVisible = true">添加项目</el-button>
            <el-button class="button" type="primary" @click="sshInfoVisable = true">服务器信息</el-button>
          </div>
        </div>
      </template>
      <el-table :data="tableData">
        <el-table-column prop="name" label="项目名" />
        <el-table-column prop="remoteName" label="服务器文件名" />
        <el-table-column prop="localPath" label="本地路径" />
        <el-table-column prop="remotePath" label="服务器器路径" />
        <el-table-column prop="command" label="打包命令" />
        <el-table-column label="操作">
          <template #default="scope">
            <el-button link type="primary" size="small"
              @click="$router.push({ path: `/pack`, query: { id: scope.row.id } })">打包</el-button>
            <el-button link type="primary" size="small" @click="handleEdit(scope.row.id)">编辑</el-button>
            <el-button link type="danger" size="small" @click="delFn(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog v-model="dialogVisible" title="添加项目" @close="resetForm(ruleFormRef)" :close-on-click-modal="false">
      <el-form ref="ruleFormRef" :model="ruleForm" :rules="rules" :label-width="120" v-if="dialogFormVisible">
        <el-form-item label="项目名" prop="name">
          <el-input placeholder="请输入..." v-model="ruleForm.name" autocomplete="off" />
        </el-form-item>
        <el-form-item label="服务器项目名" prop="remoteName">
          <el-input placeholder="请输入..." v-model="ruleForm.remoteName" autocomplete="off" />
        </el-form-item>
        <el-form-item label="服务器路径" prop="remotePath">
          <el-input placeholder="请输入..." v-model="ruleForm.remotePath" autocomplete="off" />
        </el-form-item>
        <el-form-item label="本地路径" prop="localPath">
          <el-input placeholder="请输入..." v-model="ruleForm.localPath" autocomplete="off" />
        </el-form-item>
        <el-form-item label="打包命令" prop="command">
          <el-input placeholder="请输入..." v-model="ruleForm.command" autocomplete="off" />
        </el-form-item>
      </el-form>
      <el-form ref="ruleFormRef" :model="sshForm" :rules="rules" :label-width="120" v-if="dialogsshVisible">
        <el-form-item label="选择环境" prop="type">
          <el-select v-model="sshForm.type" class="width-full" placeholder="请选择">
            <el-option label="测试环境" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="跳板机" prop="host">
          <el-input placeholder="请输入..." v-model="sshForm.host" autocomplete="off" />
        </el-form-item>
        <el-form-item label="访问端口" prop="port">
          <el-input placeholder="请输入..." v-model="sshForm.port" autocomplete="off" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input placeholder="请输入..." v-model="sshForm.username" autocomplete="off" />
        </el-form-item>
        <el-form-item label="登录密码" prop="password">
          <el-input placeholder="请输入..." v-model="sshForm.password" autocomplete="off" />
        </el-form-item>

      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetForm(ruleFormRef)">取消</el-button>
          <el-button type="primary" @click="submitForm(ruleFormRef)">保存</el-button>
        </span>
      </template>
    </el-dialog>
    <el-drawer v-model="sshInfoVisable" direction="ttb" :show-close="false" class="drawer pd_15">
      <template #header>
        <h4>服务器信息列表</h4>
        <el-button class="button" type="primary" @click="dialogsshVisible = true">添加服务器信息</el-button>
      </template>
      <template #default>
        <el-descriptions :title="item.type == 0 ? '测试环境' : '正式环境'" border :key="index"
          v-for="(item, index) in sshInfoList">
          <template #extra>
            <el-button type="primary" @click="editSSH(item.id)">修改</el-button>
            <el-button type="danger" @click="delSSH(item.id)">删除</el-button>
          </template>
          <el-descriptions-item label="跳板机">{{ item.host }}</el-descriptions-item>
          <el-descriptions-item label="访问端口">{{ item.port }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ item.username }}</el-descriptions-item>
          <el-descriptions-item label="登录密码">******</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import SystemInformation from "./LandingPage/SystemInformation.vue";
import UpdateProgress from "./updataProgress/index.vue";
import { message } from "@renderer/api/login";
import logo from "@renderer/assets/logo.png";
import { ElMessage, ElMessageBox } from "element-plus";
import { getProject, addProject, deleteProject, hasProject } from "@renderer/db/projectdb";
import { getsshInfo, deleteSSH, addSSH, hasSshInfo } from "@renderer/db/sshdb";
import { onUnmounted, Ref, ref, computed, reactive, onMounted } from "vue";
import { i18n, setLanguage } from "@renderer/i18n";
import { useI18n } from "vue-i18n";

import { useTemplateStore } from "@renderer/store/modules/template";
import TitleBar from "./common/TitleBar.vue";

const storeTemplate = useTemplateStore();

const { t } = useI18n();

console.log(`storeTemplate`, storeTemplate.getTest);
console.log(`storeTemplate`, storeTemplate.getTest1);
console.log(`storeTemplate`, storeTemplate.$state.testData);
console.log(__CONFIG__)

setTimeout(() => {
  storeTemplate.TEST_ACTION("654321");
  console.log(`storeTemplate`, storeTemplate.getTest1);
}, 1000);

const { ipcRenderer, shell } = require("electron");




const ruleFormRef = ref()
const tableData = ref([])
const dialogFormVisible = ref(false);
const dialogsshVisible = ref(false)
const sshInfoVisable = ref(false);
const sshInfoList = ref([]);
const form = {
  name: '',
  remoteName: '',
  remotePath: '',
  localPath: '',
  command: ''
}
const ssh = {
  type: "",
  host: "",
  username: "",
  password: "",
  port: ""
}
const ruleForm = reactive({ ...form })
const sshForm = reactive({ ...ssh });
const rules = reactive({
  name: [{ required: true, message: '请输入项目名', trigger: 'blur' }],
  remoteName: [{ required: true, message: '请输入服务器项目名', trigger: 'blur' }],
  remotePath: [{ required: true, message: '请输入服务器路径', trigger: 'blur' }],
  localPath: [{ required: true, message: '请输入本地路径', trigger: 'blur' }],
  command: [{ required: true, message: '请输入打包命令', trigger: 'blur' }],

  type: [{ required: true, message: '请选择环境', trigger: 'change' }],
  host: [{ required: true, message: '请输入跳板机', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }],
  port: [{ required: true, message: '请输入访问端口', trigger: 'blur' }],
})


const handleEdit = (id) => {
  hasProject(id, res => {
    Object.assign(ruleForm, res)
    dialogFormVisible.value = true
  })
}
const getProjectList = () => {
  getProject(data => {
    tableData.value = data
  })
}
const getSSHInfoList = () => {
  getsshInfo(data => {
    sshInfoList.value = [...data]
  })
}
const editSSH = (id) => {
  hasSshInfo(id, res => {
    Object.assign(sshForm, res);
    dialogsshVisible.value = true;
  })
}
const delSSH = (id) => {
  deleteSSH(id);
  getSSHInfoList();
}
const resetForm = (formEl) => {
  if (!formEl) return
  formEl.resetFields()
  Object.assign(ruleForm, { ...form, _id: null });
  Object.assign(sshForm, { ...ssh, _id: null });
  dialogFormVisible.value = false
  dialogsshVisible.value = false
}

const submitForm = async (formEl) => {
  if (!formEl) return
  await formEl.validate((valid, fields) => {
    if (valid) {
      if (dialogFormVisible.value) {
        addProject(ruleForm)
        getProjectList()
      } else {
        addSSH(sshForm);
        getSSHInfoList()
      }
      ElMessage.success('操作成功')
      resetForm(formEl)

    } else {
      console.log('error submit!', fields)
    }
  })
}

const delFn = (id) => {
  ElMessageBox.confirm(
    '确认删除吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      deleteProject(id);
      ElMessage.success('删除成功')
      getProjectList()
    })
}

const dialogVisible = computed({
  get() { return dialogFormVisible.value || dialogsshVisible.value },
  set(val) {
    if (!val) {
      dialogFormVisible.value = false
      dialogsshVisible.value = false
    }
  }
})





let percentage = ref(0);
let colors: Ref<ColorInfo[]> | Ref<string> = ref([
  { color: "#f56c6c", percentage: 20 },
  { color: "#e6a23c", percentage: 40 },
  { color: "#6f7ad3", percentage: 60 },
  { color: "#1989fa", percentage: 80 },
  { color: "#5cb87a", percentage: 100 },
]);

let progressStaus = ref(null);
let showForcedUpdate = ref(false);
let filePath = ref("");
let updateStatus = ref("");

let elPageSize = ref(100);
let elCPage = ref(1);

ipcRenderer.invoke("get-static-path").then((res) => {
  console.log("staticPath", res);
});

function changeLanguage() {
  setLanguage(i18n.global.locale.value === "zh-cn" ? "en" : "zh-cn");
}

function printDemo() {
  ipcRenderer.invoke("openPrintDemoWindow");
}

function handleSizeChange(val: number) {
  elPageSize.value = val;
}

function handleCurrentChange(val: number) {
  elCPage.value = val;
}

function crash() {
  process.crash();
}

function openNewWin() {
  let data = {
    url: "/form/index",
  };
  ipcRenderer.invoke("open-win", data);
}
function getMessage() {
  message().then((res) => {
    ElMessageBox.alert(res.data, "提示", {
      confirmButtonText: "确定",
    });
  });
}
function StopServer() {
  ipcRenderer.invoke("stop-server").then((res) => {
    ElMessage({
      type: "success",
      message: "已关闭",
    });
  });
}
function StartServer() {
  ipcRenderer.invoke("start-server").then((res) => {
    if (res) {
      ElMessage({
        type: "success",
        message: res,
      });
    }
  });
}
// 获取electron方法
function open() { }
function CheckUpdate(data) {
  switch (data) {
    case "one":
      ipcRenderer.invoke("check-update");
      break;
    case "two":
      // TODO 测试链接
      console.log('test Url')
      // ipcRenderer
      //   .invoke(
      //     "start-download",
      //     "https://az764295.vo.msecnd.net/stable/6261075646f055b99068d3688932416f2346dd3b/VSCodeUserSetup-x64-1.73.1.exe"
      //   )
      //   .then(() => {
      //     dialogVisible.value = true;
      //   });
      break;
    case "three":
      ipcRenderer.invoke("hot-update");
      break;
    case "threetest":
      alert("更新后再次点击没有提示");
      ipcRenderer.invoke("hot-update-test");
      break;
    case "four":
      showForcedUpdate.value = true;
      break;
    default:
      break;
  }
}
function openPreloadWindow() {
  ElMessageBox.alert(t("home.openPreloadWindowError.content"), t("home.openPreloadWindowError.title"), {
    confirmButtonText: t("home.openPreloadWindowError.confirm"),
    callback: (action) => { },
  });
}

function handleClose() {
  dialogVisible.value = false;
}
ipcRenderer.on("download-progress", (event, arg) => {
  console.log(arg);
  percentage.value = Number(arg);
});
ipcRenderer.on("download-error", (event, arg) => {
  if (arg) {
    progressStaus = "exception";
    percentage.value = 40;
    colors.value = "#d81e06";
  }
});
ipcRenderer.on("download-paused", (event, arg) => {
  if (arg) {
    progressStaus = "warning";
    ElMessageBox.alert("下载由于未知原因被中断！", "提示", {
      confirmButtonText: "重试",
      callback: (action) => {
        ipcRenderer.invoke("start-download");
      },
    });
  }
});
ipcRenderer.on("download-done", (event, age) => {
  filePath.value = age.filePath;
  progressStaus = "success";
  ElMessageBox.alert("更新下载完成！", "提示", {
    confirmButtonText: "确定",
    callback: (action) => {
      shell.openPath(filePath.value);
    },
  });
});
// electron-updater的更新监听
ipcRenderer.on("UpdateMsg", (event, age) => {
  switch (age.state) {
    case -1:
      const msgdata = {
        title: "发生错误",
        message: age.msg,
      };
      dialogVisible.value = false;
      ipcRenderer.invoke("open-errorbox", msgdata);
      break;
    case 0:
      ElMessage("正在检查更新");
      break;
    case 1:
      ElMessage({
        type: "success",
        message: "已检查到新版本，开始下载",
      });
      dialogVisible.value = true;
      break;
    case 2:
      ElMessage({ type: "success", message: "无新版本" });
      break;
    case 3:
      percentage = age.msg.percent.toFixed(1);
      break;
    case 4:
      progressStaus = "success";
      ElMessageBox.alert("更新下载完成！", "提示", {
        confirmButtonText: "确定",
        callback: (action) => {
          ipcRenderer.invoke("confirm-update");
        },
      });
      break;
    default:
      break;
  }
});
ipcRenderer.on("hot-update-status", (event, msg) => {
  switch (msg.status) {
    case "downloading":
      ElMessage("正在下载");
      break;
    case "moving":
      ElMessage("正在移动文件");
      break;
    case "finished":
      ElMessage.success("成功,请重启");
      break;
    case "failed":
      ElMessage.error(msg.message.message);
      break;

    default:
      break;
  }
  console.log(msg);
  updateStatus = msg.status;
});
onMounted(() => {
  getProjectList()
  getSSHInfoList()
})

onUnmounted(() => {
  console.log("销毁了哦");
  ipcRenderer.removeAllListeners("confirm-message");
  ipcRenderer.removeAllListeners("download-done");
  ipcRenderer.removeAllListeners("download-paused");
  ipcRenderer.removeAllListeners("confirm-stop");
  ipcRenderer.removeAllListeners("confirm-start");
  ipcRenderer.removeAllListeners("confirm-download");
  ipcRenderer.removeAllListeners("download-progress");
  ipcRenderer.removeAllListeners("download-error");
});
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.drawer {
  height: auto !important;
}

.el-drawer__header {
  margin-bottom: 0;
}

body {
  font-family: "Source Sans Pro", sans-serif;
}

#wrapper {
  padding: 114px 80px;
}

#logo {
  height: auto;
  margin-bottom: 20px;
  width: 420px;
}

main {
  display: flex;
  justify-content: space-between;
}

main>div {
  flex-basis: 50%;
}

.left-side {
  display: flex;
  flex-direction: column;
}

.welcome {
  color: #555;
  font-size: 23px;
  margin-bottom: 10px;
}

.title {
  color: #2c3e50;
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 6px;
}

.title.alt {
  font-size: 18px;
  margin-bottom: 10px;
}

.doc {
  margin-bottom: 10px;
}

.doc p {
  color: black;
  margin-bottom: 10px;
}

.doc .el-button {
  margin-top: 10px;
  margin-right: 10px;
}

.doc .el-button+.el-button {
  margin-left: 0;
}

.conten {
  text-align: center;
}
</style>
