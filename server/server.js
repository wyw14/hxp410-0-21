const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 41121;

const ADMIN_PASSWORD = 'admin123';
const TOKEN_EXPIRE_HOURS = 24;

const DATA_DIR = path.join(__dirname, 'data');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const COMFORT_FILE = path.join(DATA_DIR, 'comfort-messages.json');
const DAILY_SELECTION_FILE = path.join(DATA_DIR, 'daily-comfort-selection.json');
const ADMIN_TOKENS_FILE = path.join(DATA_DIR, 'admin-tokens.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SECRETS_FILE)) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify([]));
}

if (!fs.existsSync(COMFORT_FILE)) {
  const defaultComfort = [
    {
      id: uuidv4(),
      content: '今天的你已经很棒了，即使什么都没做，存在本身就很有意义。',
      author: '温暖电台',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      content: '不必强迫自己成为别人期待的样子，你本来就很好。',
      author: '温暖电台',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      content: '慢一点也没关系，每个人都有自己的时区。',
      author: '温暖电台',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      content: '你值得被爱，值得被温柔对待，值得这世间所有的美好。',
      author: '温暖电台',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      content: '难过的时候就哭出来吧，眼泪是心灵在排毒。',
      author: '温暖电台',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  fs.writeFileSync(COMFORT_FILE, JSON.stringify(defaultComfort, null, 2));
}

if (!fs.existsSync(DAILY_SELECTION_FILE)) {
  fs.writeFileSync(DAILY_SELECTION_FILE, JSON.stringify({}));
}

if (!fs.existsSync(ADMIN_TOKENS_FILE)) {
  fs.writeFileSync(ADMIN_TOKENS_FILE, JSON.stringify([]));
}

app.use(cors());
app.use(express.json());

function readSecrets() {
  const data = fs.readFileSync(SECRETS_FILE, 'utf8');
  return JSON.parse(data);
}

function writeSecrets(secrets) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2));
}

function readComfort() {
  const data = fs.readFileSync(COMFORT_FILE, 'utf8');
  return JSON.parse(data);
}

function writeComfort(comfort) {
  fs.writeFileSync(COMFORT_FILE, JSON.stringify(comfort, null, 2));
}

function readDailySelection() {
  const data = fs.readFileSync(DAILY_SELECTION_FILE, 'utf8');
  return JSON.parse(data);
}

function writeDailySelection(selection) {
  fs.writeFileSync(DAILY_SELECTION_FILE, JSON.stringify(selection, null, 2));
}

function readAdminTokens() {
  const data = fs.readFileSync(ADMIN_TOKENS_FILE, 'utf8');
  return JSON.parse(data);
}

function writeAdminTokens(tokens) {
  fs.writeFileSync(ADMIN_TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function verifyAdminToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.split(' ')[1];
  const tokens = readAdminTokens();
  const now = Date.now();

  const validToken = tokens.find(t => t.token === token && t.expiresAt > now);
  return !!validToken;
}

function adminAuthMiddleware(req, res, next) {
  if (!verifyAdminToken(req)) {
    return res.status(401).json({ error: '无权限访问，请先登录' });
  }
  next();
}

function getDailyComfortIndex(total, dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % total;
}

app.post('/api/secrets', (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '秘密内容不能为空' });
    }

    const secrets = readSecrets();
    const newSecret = {
      id: uuidv4(),
      content: content.trim(),
      status: '已宽恕',
      createdAt: new Date().toISOString()
    };

    secrets.push(newSecret);
    writeSecrets(secrets);

    res.json({
      success: true,
      message: '你的秘密已被宽恕',
      secret: newSecret
    });
  } catch (error) {
    console.error('保存秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/secrets/random', (req, res) => {
  try {
    const secrets = readSecrets();
    const forgivenSecrets = secrets.filter(s => s.status === '已宽恕');

    if (forgivenSecrets.length === 0) {
      return res.json({
        hasSecret: false,
        message: '还没有被宽恕的秘密，成为第一个分享的人吧'
      });
    }

    const randomIndex = Math.floor(Math.random() * forgivenSecrets.length);
    const randomSecret = forgivenSecrets[randomIndex];

    res.json({
      hasSecret: true,
      secret: {
        id: randomSecret.id,
        content: randomSecret.content,
        status: randomSecret.status
      }
    });
  } catch (error) {
    console.error('获取随机秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/admin/login', (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: '请输入密码' });
    }

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: '密码错误' });
    }

    const token = generateToken();
    const expiresAt = Date.now() + TOKEN_EXPIRE_HOURS * 60 * 60 * 1000;

    const tokens = readAdminTokens();
    tokens.push({ token, expiresAt, createdAt: Date.now() });
    writeAdminTokens(tokens.filter(t => t.expiresAt > Date.now()));

    res.json({
      success: true,
      token,
      expiresAt
    });
  } catch (error) {
    console.error('登录时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const tokens = readAdminTokens();
      writeAdminTokens(tokens.filter(t => t.token !== token));
    }
    res.json({ success: true, message: '已退出登录' });
  } catch (error) {
    console.error('退出登录时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/admin/verify', (req, res) => {
  try {
    const isAdmin = verifyAdminToken(req);
    res.json({ isAdmin });
  } catch (error) {
    console.error('验证权限时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/comfort/today', (req, res) => {
  try {
    const comfortMessages = readComfort();
    const activeMessages = comfortMessages.filter(m => m.status === 'active');
    const today = new Date().toISOString().split('T')[0];
    const dailySelection = readDailySelection();

    let todayMessage = null;
    let selectedMessageId = null;

    if (dailySelection[today]) {
      selectedMessageId = dailySelection[today].messageId;
      todayMessage = comfortMessages.find(m => m.id === selectedMessageId);
      
      if (!todayMessage) {
        delete dailySelection[today];
        writeDailySelection(dailySelection);
      }
    }

    if (!todayMessage && activeMessages.length === 0) {
      return res.json({
        hasMessage: false,
        message: '暂时没有安慰文案'
      });
    }

    if (!todayMessage) {
      const index = getDailyComfortIndex(activeMessages.length, today);
      todayMessage = activeMessages[index];
      selectedMessageId = todayMessage.id;

      dailySelection[today] = {
        messageId: selectedMessageId,
        selectedAt: new Date().toISOString()
      };
      writeDailySelection(dailySelection);
    }

    res.json({
      hasMessage: true,
      message: {
        id: todayMessage.id,
        content: todayMessage.content,
        author: todayMessage.author
      },
      date: today,
      isOriginalActive: todayMessage.status === 'active'
    });
  } catch (error) {
    console.error('获取今日安慰文案时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/comfort', adminAuthMiddleware, (req, res) => {
  try {
    const comfortMessages = readComfort();
    const { status } = req.query;
    
    let result = comfortMessages;
    if (status) {
      result = comfortMessages.filter(m => m.status === status);
    }

    res.json({
      total: result.length,
      messages: result
    });
  } catch (error) {
    console.error('获取安慰文案列表时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/comfort', adminAuthMiddleware, (req, res) => {
  try {
    const { content, author } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '安慰文案内容不能为空' });
    }

    const comfortMessages = readComfort();
    const newMessage = {
      id: uuidv4(),
      content: content.trim(),
      author: author || '温暖电台',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    comfortMessages.push(newMessage);
    writeComfort(comfortMessages);

    res.json({
      success: true,
      message: '安慰文案添加成功',
      data: newMessage
    });
  } catch (error) {
    console.error('添加安慰文案时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.put('/api/comfort/:id', adminAuthMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { content, author } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '安慰文案内容不能为空' });
    }

    const comfortMessages = readComfort();
    const index = comfortMessages.findIndex(m => m.id === id);

    if (index === -1) {
      return res.status(404).json({ error: '安慰文案不存在' });
    }

    comfortMessages[index] = {
      ...comfortMessages[index],
      content: content.trim(),
      author: author || comfortMessages[index].author,
      updatedAt: new Date().toISOString()
    };

    writeComfort(comfortMessages);

    res.json({
      success: true,
      message: '安慰文案更新成功',
      data: comfortMessages[index]
    });
  } catch (error) {
    console.error('更新安慰文案时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.patch('/api/comfort/:id/status', adminAuthMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: '状态值无效，只能是 active 或 inactive' });
    }

    const comfortMessages = readComfort();
    const index = comfortMessages.findIndex(m => m.id === id);

    if (index === -1) {
      return res.status(404).json({ error: '安慰文案不存在' });
    }

    comfortMessages[index] = {
      ...comfortMessages[index],
      status,
      updatedAt: new Date().toISOString()
    };

    writeComfort(comfortMessages);

    res.json({
      success: true,
      message: `安慰文案已${status === 'active' ? '启用' : '停用'}`,
      data: comfortMessages[index]
    });
  } catch (error) {
    console.error('更新安慰文案状态时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.listen(PORT, () => {
  console.log(`忏悔室后端服务运行在 http://localhost:${PORT}`);
});
