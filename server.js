const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const posts = [];
const pendingPosts = {};
const categories = [
  "data-science",
  "cyber-security",
  "cloud-computing",
  "regression",
  "artificial-intelligence",
  "machine-learning",
  "data-analytics"
];

function generateBigContent(topic) {
  return `
    ${topic} is a rapidly evolving field that has profound impacts on modern technology, business, and society at large. In recent years, ${topic} has grown exponentially, enabling groundbreaking innovations and transforming how organizations operate. This shift is fueled by significant advancements in computational power, algorithmic efficiency, and collaborative research.
    <br><br>
    As companies seek to harness the power of ${topic}, they invest in large-scale data processing, sophisticated models, and cross-functional teams. This has led to new roles and responsibilities, bridging the gap between domain expertise and technical proficiency. Researchers and engineers are continually refining tools and techniques, making ${topic} more accessible to a broader audience. For instance, advancements in frameworks and libraries have democratized access, allowing even small startups to leverage cutting-edge solutions.
    <br><br>
    Moreover, ethical considerations have become paramount. Stakeholders must address issues such as data privacy, algorithmic bias, and the potential displacement of human labor. Many leading voices in the tech industry argue that ${topic} must evolve in a way that fosters responsible innovation, ensuring long-term societal benefits. Case studies from recent industry reports highlight how organizations are implementing ethical guidelines to balance innovation with accountability.
    <br><br>
    Looking ahead, experts predict an even faster rate of adoption and expansion. Emerging trends, such as edge computing, quantum computing, and advanced neural architectures, promise to redefine the capabilities of ${topic}. As open-source communities continue to collaborate on cutting-edge projects, the collective knowledge pool grows, driving the field forward at an unprecedented pace. These trends are already influencing sectors like healthcare, where ${topic} is optimizing diagnostics, and finance, where it’s enhancing fraud detection.
    <br><br>
    Ultimately, the future of ${topic} hinges on interdisciplinary efforts. By combining expertise from fields like computer science, mathematics, ethics, and design, we can create robust solutions that tackle some of the world's most pressing challenges. From healthcare to finance, ${topic} stands poised to revolutionize entire industries, paving the way for a more connected and efficient global ecosystem. Ongoing research and real-world applications continue to push the boundaries, ensuring that ${topic} remains at the forefront of technological progress.
  `.trim();
}

// Generate sample posts
for (let i = 0; i < 15; i++) {
  const category = categories[Math.floor(Math.random() * categories.length)];
  posts.push({
    id: i,
    title: `${category.replace('-', ' ').toUpperCase()} Post ${i + 1}`,
    date: new Date().toLocaleDateString(),
    category,
    description: `A brief overview of ${category} advancements and trends in ${2025 - i}.`,
    content: generateBigContent(category),
    image: `/uploads/sample${i % 5}.jpg`,
    verified: true,
    comments: []
  });
}

// Nodemailer setup (replace with real SMTP details)
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your_email@example.com',
    pass: 'your_password'
  }
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

app.get('/projects', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'projects.html'));
});

app.get('/reviews', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'reviews.html'));
});

app.get('/submit', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'submit.html'));
});

app.get('/verify-success', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'verify-success.html'));
});

app.get('/post/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'post.html'));
});

app.get('/api/posts', (req, res) => {
  const { category, search } = req.query;
  let filteredPosts = posts;
  if (category && category !== 'all') {
    filteredPosts = filteredPosts.filter(post => post.category === category);
  }
  if (search) {
    const searchTerm = search.toLowerCase();
    filteredPosts = filteredPosts.filter(post =>
      post.title.toLowerCase().includes(searchTerm) ||
      post.description.toLowerCase().includes(searchTerm)
    );
  }
  res.json(filteredPosts);
});

app.get('/api/post/:id', (req, res) => {
  const post = posts.find(p => p.id == req.params.id);
  if (post) res.json(post);
  else res.status(404).json({ message: "Post not found" });
});

app.post('/api/submit', upload.single('image'), (req, res) => {
  const { name, email, title, category, description, content } = req.body;
  if (!name || !email || !title || !category || !description || !content) {
    return res.status(400).json({ message: "All fields are required." });
  }
  if (posts.some(p => p.title.toLowerCase() === title.toLowerCase())) {
    return res.status(400).json({ message: "A post with this title already exists. Please choose a different title." });
  }
  const token = Math.random().toString(36).substring(2);
  const newPost = {
    id: posts.length,
    title,
    date: new Date().toLocaleDateString(),
    category,
    description,
    content,
    image: req.file ? `/uploads/${req.file.filename}` : null,
    verified: false,
    comments: []
  };
  pendingPosts[token] = newPost;
  const verificationURL = `http://localhost:${port}/api/verify?token=${token}`;
  const mailOptions = {
    from: 'your_email@example.com',
    to: email,
    subject: 'Verify Your Blog Submission',
    text: `Click here to verify: ${verificationURL}`
  };
  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.log(error);
      return res.status(500).json({ message: "Email sending failed." });
    }
    res.json({ message: "Check your email for a verification link!" });
  });
});

app.get('/api/verify', (req, res) => {
  const { token } = req.query;
  const pending = pendingPosts[token];
  if (!pending) {
    return res.status(400).send("Invalid or expired token.");
  }
  pending.verified = true;
  posts.push(pending);
  delete pendingPosts[token];
  res.redirect('/verify-success');
});

app.post('/api/comment/:id', (req, res) => {
  const post = posts.find(p => p.id == req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  const { name, comment } = req.body;
  if (!name || !comment) return res.status(400).json({ message: "Name and comment are required." });
  post.comments.push({ name, comment, date: new Date().toLocaleDateString() });
  res.json({ message: "Comment added!" });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});