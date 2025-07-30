# 访问者地图后端部署指南

## 1. 设置MongoDB Atlas数据库

### 1.1 创建MongoDB Atlas账户
1. 访问 [MongoDB Atlas](https://www.mongodb.com/atlas)
2. 注册免费账户
3. 创建新集群（选择免费层 M0）

### 1.2 配置数据库
1. 在集群中创建数据库 `visitor-map`
2. 创建集合 `visitors`
3. 设置网络访问（允许所有IP：0.0.0.0/0）
4. 创建数据库用户（记住用户名和密码）

### 1.3 获取连接字符串
1. 点击 "Connect" 按钮
2. 选择 "Connect your application"
3. 复制连接字符串，格式如下：
   ```
   mongodb+srv://username:password@cluster.mongodb.net/visitor-map?retryWrites=true&w=majority
   ```

## 2. 部署Vercel Functions

### 2.1 安装Vercel CLI
```bash
npm install -g vercel
```

### 2.2 登录Vercel
```bash
vercel login
```

### 2.3 设置环境变量
```bash
vercel env add MONGODB_URI
# 输入你的MongoDB连接字符串
```

### 2.4 部署应用
```bash
vercel --prod
```

### 2.5 获取部署URL
部署完成后，你会得到一个URL，类似：
```
https://your-app-name.vercel.app
```

## 3. 更新前端代码

### 3.1 更新API URL
在 `assets/js/visitor-map.js` 文件中，将第6行的URL替换为你的Vercel部署URL：

```javascript
this.apiUrl = 'https://your-app-name.vercel.app/api/visitors';
```

### 3.2 更新CORS设置
在 `api/visitors.js` 文件中，更新 `ALLOWED_ORIGINS` 数组：

```javascript
const ALLOWED_ORIGINS = [
  'https://zhishuoliu.github.io',
  'https://your-github-username.github.io',
  'http://localhost:4000',
  'http://localhost:3000'
];
```

## 4. 测试部署

### 4.1 测试API端点
```bash
# 测试GET请求
curl https://your-app-name.vercel.app/api/visitors

# 测试POST请求
curl -X POST https://your-app-name.vercel.app/api/visitors \
  -H "Content-Type: application/json" \
  -d '{"lat": 40.7128, "lng": -74.0060, "city": "New York", "country": "United States", "ip": "192.168.1.1"}'
```

### 4.2 检查数据库
在MongoDB Atlas控制台中查看 `visitors` 集合，确认数据是否正确存储。

## 5. 监控和维护

### 5.1 Vercel监控
- 访问 [Vercel Dashboard](https://vercel.com/dashboard)
- 查看函数调用次数和错误日志

### 5.2 MongoDB监控
- 在MongoDB Atlas中监控数据库使用情况
- 免费层限制：512MB存储，共享RAM

### 5.3 成本控制
- Vercel Functions：每月100GB-Hours免费
- MongoDB Atlas：免费层足够小规模使用

## 6. 故障排除

### 6.1 常见问题
1. **CORS错误**：检查 `ALLOWED_ORIGINS` 设置
2. **数据库连接失败**：验证MongoDB连接字符串
3. **函数超时**：检查网络连接和数据库响应时间

### 6.2 日志查看
```bash
# 查看Vercel函数日志
vercel logs

# 查看特定函数的日志
vercel logs api/visitors
```

## 7. 安全考虑

### 7.1 数据隐私
- 只存储必要的访问信息
- 考虑添加IP地址匿名化
- 定期清理旧数据

### 7.2 API安全
- 考虑添加API密钥验证
- 限制请求频率
- 监控异常访问模式

## 8. 扩展功能

### 8.1 可能的改进
- 添加访问者聚类显示
- 实现实时更新（WebSocket）
- 添加访问时间线功能
- 集成Google Analytics数据

### 8.2 性能优化
- 实现数据缓存
- 优化数据库查询
- 添加CDN支持 