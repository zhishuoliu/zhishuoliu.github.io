import { MongoClient } from 'mongodb';

// MongoDB连接配置
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'visitor-map';
const COLLECTION_NAME = 'visitors';

// 允许的域名（CORS配置）
const ALLOWED_ORIGINS = [
  'https://zhishuoliu.github.io',
  'http://localhost:4000',
  'http://localhost:3000'
];

export default async function handler(req, res) {
  // 设置CORS头
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    if (req.method === 'POST') {
      // 添加新访问者
      const visitorData = req.body;
      
      // 验证数据
      if (!visitorData.lat || !visitorData.lng || !visitorData.ip) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // 添加时间戳
      visitorData.timestamp = new Date();
      visitorData.userAgent = req.headers['user-agent'] || 'Unknown';
      visitorData.referer = req.headers.referer || 'Direct';

      // 检查是否已存在相同IP的访问记录（24小时内）
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existingVisitor = await collection.findOne({
        ip: visitorData.ip,
        timestamp: { $gte: oneDayAgo }
      });

      if (existingVisitor) {
        // 更新现有记录
        await collection.updateOne(
          { _id: existingVisitor._id },
          { 
            $set: { 
              timestamp: new Date(),
              userAgent: visitorData.userAgent,
              referer: visitorData.referer
            }
          }
        );
        return res.status(200).json({ message: 'Visitor updated', visitor: existingVisitor });
      } else {
        // 插入新记录
        const result = await collection.insertOne(visitorData);
        return res.status(201).json({ 
          message: 'Visitor added', 
          visitor: { ...visitorData, _id: result.insertedId }
        });
      }
    }

    if (req.method === 'GET') {
      // 获取访问者数据
      const limit = parseInt(req.query.limit) || 50;
      const visitors = await collection
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      // 获取统计信息
      const totalVisitors = await collection.countDocuments();
      const uniqueCountries = await collection.distinct('country');
      const uniqueCities = await collection.distinct('city');

      return res.status(200).json({
        visitors,
        stats: {
          total: totalVisitors,
          countries: uniqueCountries.length,
          cities: uniqueCities.length
        }
      });
    }

    await client.close();
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 