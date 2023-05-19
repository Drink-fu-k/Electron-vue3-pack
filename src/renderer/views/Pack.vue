<template>
  <div class="print column pd_50">
    <el-card>
      <el-backtop :right="60" :bottom="60" />
      <template #header>
        <div class="card-header flex-between">
          <span>控制台输出</span>
          <el-affix :offset="50">
            <el-button class="button" type="primary" :disabled="packDisabled" @click="packFn">打包</el-button>
            <el-button class="button" type="primary" :disabled="pubDisabled" @click="publishFn">发布</el-button>
            <el-button class="button" type="primary" @click="activities = []">清空控制台信息</el-button>
            <el-button class="button" type="primary" @click="$router.back()">返回</el-button>
          </el-affix>
        </div>
      </template>
      <el-timeline v-loading="loading" element-loading-background="rgba(255, 255, 255, 0.1)">
        <el-timeline-item v-for="(activity, index) in activities" :key="index" hide-timestamp>
          {{ activity }}
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>
<script lang="ts" setup>
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router';
import { hasProject } from "@renderer/db/projectdb";
import { getsshInfo } from "@renderer/db/sshdb";

const { ipcRenderer } = require("electron")
const router = useRouter();
const activities = ref([])
const currentProject = reactive({});
const currentSSHINFO = reactive({})
const packDisabled = ref(false);
const pubDisabled = ref(true);
const loading = ref(false);
const publishFn = () => {
  loading.value = true;
  packDisabled.value = true;
  pubDisabled.value = true;
  let ssh = JSON.stringify(currentSSHINFO)
  let project = JSON.stringify(currentProject)
  ipcRenderer.invoke('public', project, ssh)
}
const packFn = () => {
  activities.value = []
  loading.value = true;
  packDisabled.value = true;
  let project = JSON.stringify(currentProject)
  ipcRenderer.invoke('pack', project)
}

onMounted(async () => {
  let id = router.currentRoute.value.query.id
  hasProject(Number(id), data => {
    Object.assign(currentProject, data)
  })
  getsshInfo(data => {
    let obj = data.find(item => item.type == 0) // 测试环境
    Object.assign(currentSSHINFO, obj)
  })
  ipcRenderer.on('pipMsg', (e, msg) => {
    activities.value.push(msg);
  })
  ipcRenderer.on('packMsg', (e, type) => {
    loading.value = false;
    if (type) {
      packDisabled.value = false;
      pubDisabled.value = false
      return
    }
  })
})

</script>