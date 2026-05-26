import dotenv from "dotenv";
dotenv.config();

import express from "express";
import session from "express-session";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./db/mongoose.js";
import { User } from "./db/userModel.js";
import { Photo } from "./db/photoModel.js";
import { SchemaInfo } from "./db/schemaInfo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI;

const isDevbox = process.env.CODESANDBOX_SSE === "true" || !!process.env.PORT;
if (isDevbox) {
  app.set("trust proxy", 1);
}

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "https://rp8gzj-3000.csb.app"],
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: "photo-app-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    secure: isDevbox,
    sameSite: isDevbox ? "none" : "lax",
  },
}));

// Serve uploaded images as static files
const imagesDir = path.join(__dirname, "images");
app.use("/images", express.static(imagesDir));

// Multer config for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imagesDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// Auth middleware - skip for login, logout, register
function requireLogin(req, res, next) {
  // Skip auth for these routes
  if (
    (req.method === "POST" && req.path === "/admin/login") ||
    (req.method === "POST" && req.path === "/admin/logout") ||
    (req.method === "POST" && req.path === "/user") ||
    (req.method === "GET" && req.path === "/admin/check")
  ) {
    return next();
  }
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
app.use(requireLogin);

// ==================== AUTH ENDPOINTS ====================

// Check login status
app.get("/admin/check", (req, res) => {
  if (req.session.userId) {
    return res.json({
      _id: req.session.userId,
      first_name: req.session.firstName,
      login_name: req.session.loginName,
    });
  }
  res.json(null);
});

// POST /admin/login
app.post("/admin/login", async (req, res) => {
  try {
    const { login_name, password } = req.body;
    if (!login_name) {
      return res.status(400).json({ error: "login_name is required" });
    }
    const user = await User.findOne({ login_name }).lean();
    if (!user) {
      return res.status(400).json({ error: "Invalid login_name" });
    }
    if (user.password !== password) {
      return res.status(400).json({ error: "Wrong password" });
    }
    // Store user info in session
    req.session.userId = user._id;
    req.session.firstName = user.first_name;
    req.session.loginName = user.login_name;
    res.json({
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      login_name: user.login_name,
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /admin/logout
app.post("/admin/logout", (req, res) => {
  if (!req.session.userId) {
    return res.status(400).json({ error: "Not logged in" });
  }
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// ==================== USER ENDPOINTS ====================

// POST /user - Register new user
app.post("/user", async (req, res) => {
  try {
    const { login_name, password, first_name, last_name, location, description, occupation } = req.body;

    if (!login_name || !login_name.trim()) {
      return res.status(400).json({ error: "login_name is required" });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ error: "password is required" });
    }
    if (!first_name || !first_name.trim()) {
      return res.status(400).json({ error: "first_name is required" });
    }
    if (!last_name || !last_name.trim()) {
      return res.status(400).json({ error: "last_name is required" });
    }

    // Check if login_name already exists
    const existing = await User.findOne({ login_name }).lean();
    if (existing) {
      return res.status(400).json({ error: "login_name already exists" });
    }

    const newUser = await User.create({
      _id: new (await import("mongoose")).default.Types.ObjectId().toString(),
      login_name: login_name.trim(),
      password: password.trim(),
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      location: location || "",
      description: description || "",
      occupation: occupation || "",
    });

    res.json({
      _id: newUser._id,
      login_name: newUser.login_name,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
    });
  } catch (error) {
    res.status(400).json({ error: "Registration failed: " + error.message });
  }
});

// GET /user/list
app.get("/user/list", async (req, res) => {
  try {
    const [users, photos] = await Promise.all([
      User.find({}, {
        _id: 1,
        first_name: 1,
        last_name: 1,
        location: 1,
        occupation: 1,
      }).lean(),
      Photo.find({}, {
        user_id: 1,
        comments: 1,
      }).lean(),
    ]);

    const photoCount = {};
    const commentCount = {};

    photos.forEach((photo) => {
      photoCount[photo.user_id] = (photoCount[photo.user_id] || 0) + 1;
      if (Array.isArray(photo.comments)) {
        photo.comments.forEach((comment) => {
          const userId = comment.user?._id;
          if (userId) {
            commentCount[userId] = (commentCount[userId] || 0) + 1;
          }
        });
      }
    });

    const response = users.map((user) => ({
      ...user,
      photo_count: photoCount[user._id] || 0,
      comment_count: commentCount[user._id] || 0,
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch user list" });
  }
});

// GET /user/:id
app.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findOne(
      { _id: req.params.id },
      {
        _id: 1,
        first_name: 1,
        last_name: 1,
        location: 1,
        description: 1,
        occupation: 1,
      }
    ).lean();

    if (!user) {
      return res.status(400).json({ error: `User ${req.params.id} not found` });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch user details" });
  }
});

// ==================== PHOTO ENDPOINTS ====================

// GET /photosOfUser/:id
app.get("/photosOfUser/:id", async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id }).lean();
    if (!user) {
      return res.status(400).json({ error: `User ${req.params.id} not found` });
    }

    const photos = await Photo.find(
      { user_id: req.params.id },
      {
        _id: 1,
        user_id: 1,
        file_name: 1,
        date_time: 1,
        comments: 1,
      }
    ).lean();

    const response = photos.map((photo) => ({
      _id: photo._id,
      user_id: photo.user_id,
      file_name: photo.file_name,
      date_time: photo.date_time,
      comments: Array.isArray(photo.comments)
        ? photo.comments.map((comment) => ({
            _id: comment._id,
            date_time: comment.date_time,
            comment: comment.comment,
            user: {
              _id: comment.user?._id,
              first_name: comment.user?.first_name,
              last_name: comment.user?.last_name,
            },
          }))
        : [],
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch photos for user" });
  }
});

// POST /photos/new - Upload a new photo
app.post("/photos/new", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const mongoose = (await import("mongoose")).default;
    const newPhoto = await Photo.create({
      _id: new mongoose.Types.ObjectId().toString(),
      file_name: req.file.filename,
      date_time: new Date().toISOString(),
      user_id: req.session.userId,
      comments: [],
    });

    res.json(newPhoto);
  } catch (error) {
    res.status(500).json({ error: "Unable to upload photo" });
  }
});

// ==================== COMMENT ENDPOINTS ====================

// POST /commentsOfPhoto/:photo_id
app.post("/commentsOfPhoto/:photo_id", async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: "Comment cannot be empty" });
    }

    const photo = await Photo.findOne({ _id: req.params.photo_id });
    if (!photo) {
      return res.status(400).json({ error: "Photo not found" });
    }

    // Get the logged-in user info for embedding in the comment
    const user = await User.findOne({ _id: req.session.userId }).lean();
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const mongoose = (await import("mongoose")).default;
    const newComment = {
      _id: new mongoose.Types.ObjectId().toString(),
      comment: comment.trim(),
      date_time: new Date().toISOString(),
      user: {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    };

    photo.comments.push(newComment);
    await photo.save();

    res.json(newComment);
  } catch (error) {
    res.status(500).json({ error: "Unable to add comment" });
  }
});

// GET /commentsOfUser/:id
app.get("/commentsOfUser/:id", async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id }).lean();
    if (!user) {
      return res.status(400).json({ error: `User ${req.params.id} not found` });
    }

    const photos = await Photo.find(
      { "comments.user._id": req.params.id },
      {
        _id: 1,
        user_id: 1,
        file_name: 1,
        comments: 1,
      }
    ).lean();

    const comments = [];
    photos.forEach((photo) => {
      if (Array.isArray(photo.comments)) {
        photo.comments.forEach((comment) => {
          if (comment.user?._id === req.params.id) {
            comments.push({
              _id: comment._id,
              date_time: comment.date_time,
              comment: comment.comment,
              photo_id: photo._id,
              photo_file_name: photo.file_name,
              photo_user_id: photo.user_id,
            });
          }
        });
      }
    });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch comments for user" });
  }
});

// GET /test/info
app.get("/test/info", async (req, res) => {
  try {
    const schemaInfo = await SchemaInfo.findOne({ _id: "schemaInfo" }).lean();
    if (!schemaInfo) {
      return res.status(500).json({ error: "Schema info not available" });
    }
    res.json(schemaInfo);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch schema info" });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Start server
connectDB(mongoUri)
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend server running at http://localhost:${port}`);
      console.log(`Connected to MongoDB at ${mongoUri}`);
    });
  })
  .catch((error) => {
    console.error("Unable to connect to MongoDB:", error);
    process.exit(1);
  });
