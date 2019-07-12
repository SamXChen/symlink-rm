## 使用方法
``` bash
symlink-rm --dir="/Users/xxx/projects/xxx/modules/client" --hoist=true
```

### 说明
 - dir：目标路径  // 可选，不写时，为当前目录
 - hoist：是否为提升模式 // 默认 为 false, 选定为 true 时，当出现多个 symlinks 指向相同的目标路径时，最终只会保留一份真实文件
 