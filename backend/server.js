const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB bağlantısı
mongoose.connect('mongodb://127.0.0.1:27017/sprinkler-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Proje modeli
const ProjectSchema = new mongoose.Schema({
  customId: { type: String, unique: true },  // Özel ID alanı
  name: String,
  elements: Array,  // Çizim elemanları (sprinkler, borular, pompalar vs.)
  information: Object,
  calculations: Object,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Project = mongoose.model('Project', ProjectSchema);

// Proje oluşturma
app.post('/projects', async (req, res) => {
  try {
    const newProject = new Project(req.body);
    await newProject.save();
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ message: 'Proje oluşturulamadı', error });
  }
});

// Projeleri listeleme
app.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (error) {
    console.error('Projeler alınamadı:', error); // Konsola yaz
    res.status(500).json({ message: 'Projeler alınamadı', error: error.message });
  }
});

// Belirli bir projeyi alma
app.get('/projects/:customId', async (req, res) => {
  try {
    const project = await Project.findOne({ customId: req.params.customId });
    if (project) {
      res.json(project);
    } else {
      res.status(404).json({ message: 'Proje bulunamadı' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error });
  }
});

// Proje güncelleme
app.put('/projects/:customId', async (req, res) => {
  try {
    const { customId } = req.params;
    const updatedData = req.body;

    const project = await Project.findOneAndUpdate(
      { customId: customId },
      { ...updatedData, updatedAt: Date.now() },
      { new: true } // Bu seçenek, güncellenmiş projeyi geri döndürür
    );

    if (!project) {
      return res.status(404).json({ message: 'Proje bulunamadı' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Proje güncellenemedi', error });
  }
});

// Proje silme
app.delete('/projects/:customId', async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ customId: req.params.customId });
    if (!project) {
      return res.status(404).json({ message: 'Proje bulunamadı' });
    }
    res.status(204).end(); // Silinen projeyi geri döndürmeyelim
  } catch (error) {
    res.status(500).json({ message: 'Proje silinemedi', error });
  }
});

// Sunucu başlatma
app.listen(5000, () => {
  console.log('Sunucu 5000 portunda çalışıyor...');
});
