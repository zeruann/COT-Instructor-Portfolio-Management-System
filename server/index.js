require('dotenv').config({ debug: true });

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const invitationRoutes = require("./routes/invitationRoutes");
const instructorRoutes = require("./routes/instructorRoutes");

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use("/api/auth", authRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/instructors", instructorRoutes);
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/academic-periods', require('./routes/academicPeriodRoutes'));
app.use('/api/classes', require('./routes/classRoutes'));
app.use('/api/requirements', require('./routes/requirementRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/locks', require('./routes/lockRoutes'));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    require('./utils/ensureClassRequirements')();
  })
  .catch((err) => console.error(err));

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the server" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));