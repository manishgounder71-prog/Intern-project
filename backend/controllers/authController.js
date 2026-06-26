import User from '../../database/models/User.js';
import Document from '../../database/models/Document.js';
import Flashcard from '../../database/models/Flashcard.js';
import Quiz from '../../database/models/Quiz.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'studygen-secret-super-key-2026';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    // Update streak logic
    const today = new Date().toDateString();
    const lastActiveDate = user.lastActive ? new Date(user.lastActive).toDateString() : null;

    if (lastActiveDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();

      if (lastActiveDate === yesterdayString) {
        user.streak += 1;
      } else {
        user.streak = 1; // reset streak if gap exists
      }
      user.lastActive = new Date();
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Please provide your email address.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${token}`;
    console.log(`[DEV] Password reset link: ${resetUrl}`);

    res.json({ message: 'Password reset link has been sent to your email (check server console in dev mode).' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Please provide a new password.' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Reset token is invalid or has expired.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, avatar } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        avatar: user.avatar
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'This email is already in use.' });
    }
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Fetch learning stats for dashboard
    const docCount = await Document.countDocuments({ owner: user._id });
    const flashcardCount = await Flashcard.countDocuments({ owner: user._id });
    const quizCount = await Quiz.countDocuments({ owner: user._id });
    
    // Sum quiz attempts
    const quizzes = await Quiz.find({ owner: user._id });
    let completedQuizzesCount = 0;
    let totalScore = 0;
    let totalQuestions = 0;
    
    quizzes.forEach(q => {
      completedQuizzesCount += q.attempts.length;
      q.attempts.forEach(attempt => {
        totalScore += attempt.score;
        totalQuestions += attempt.totalQuestions;
      });
    });

    const averageQuizScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        avatar: user.avatar
      },
      stats: {
        documentsUploaded: docCount,
        flashcardsCreated: flashcardCount,
        quizzesTaken: completedQuizzesCount,
        averageScore: averageQuizScore
      }
    });
  } catch (error) {
    next(error);
  }
};
