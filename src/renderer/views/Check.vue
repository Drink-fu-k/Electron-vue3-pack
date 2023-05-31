<template>
  <div class="print column pd_50">
    <el-card v-loading="loading">
      <el-backtop :right="60" :bottom="60" />
      <template #header>
        <div class="card-header flex-between">
          <span>控制台输出</span>
          <el-affix :offset="50">
            <el-button class="button" type="primary" @click="checkFn(0)">检测整个项目</el-button>
            <el-button class="button" type="primary" @click="checkFn(1)">多文件检测</el-button>
            <el-button class="button" type="primary" @click="html = null">清空控制台</el-button>
            <el-button class="button" type="primary" @click="$router.back()">返回</el-button>
          </el-affix>
        </div>
      </template>
      <div v-html="html" class="width-full" />
    </el-card>
  </div>
</template>
<script lang="ts" setup>
import { ref, onMounted, reactive, nextTick } from 'vue'
import { useRouter } from 'vue-router';
const { ipcRenderer } = require("electron")
const router = useRouter();
const html = ref(null)
const loading = ref(false);
const localPath = ref('')

const checkFn = (type) => {
  loading.value = true;
  if (type) return ipcRenderer.invoke('checkFile', localPath.value)
  ipcRenderer.invoke('checkProject', localPath.value)
}

onMounted(async () => {
  localPath.value = router.currentRoute.value.query.localPath

  ipcRenderer.on('checkMsg', (e, data) => {
    html.value = data
  })
  ipcRenderer.on('checkDone', () => {
    nextTick(() => {
      let groups = document.querySelectorAll("tr[data-group]");
      groups.forEach(group => {
        group.addEventListener("click", function () {
          let inGroup = document.getElementsByClassName(this.getAttribute("data-group"));
          this.innerHTML = (this.innerHTML.indexOf("+") > -1) ? this.innerHTML.replace("+", "-") : this.innerHTML.replace("-", "+");
          for (let j = 0; j < inGroup.length; j++) {
            inGroup[j].style.display = (inGroup[j].style.display !== "none") ? "none" : "table-row";
          }
        })
      })
    })
    loading.value = false;
  })
})

</script>