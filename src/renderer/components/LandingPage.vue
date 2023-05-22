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
            <el-option label="正式环境" value="1" />
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
import { ElMessage, ElMessageBox } from "element-plus";
import { getProject, addProject, deleteProject, hasProject } from "@renderer/db/projectdb";
import { getsshInfo, deleteSSH, addSSH, hasSshInfo } from "@renderer/db/sshdb";
import { ref, computed, reactive, onMounted } from "vue";

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

onMounted(() => {
  getProjectList()
  getSSHInfoList()
})

</script>

<style lang="scss">
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
  padding-top: 0;
}

body {
  font-family: "Source Sans Pro", sans-serif;
}

#wrapper {
  padding: 114px 80px;
}
</style>
