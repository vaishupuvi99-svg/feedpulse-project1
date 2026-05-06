import { Request, Response } from 'express';
import Feedback from '../models/feedback.model';
import { analyzeWithGemini } from '../services/gemini.service';

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const { title, description, category, submitterName, submitterEmail } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ success: false, error: 'Missing required fields', message: 'Title, description and category are required', data: null });
    }
    const feedback = await Feedback.create({ title, description, category, submitterName, submitterEmail });
    const aiResult = await analyzeWithGemini(title, description);
    if (aiResult) await Feedback.findByIdAndUpdate(feedback._id, aiResult);
    const updated = await Feedback.findById(feedback._id);
    return res.status(201).json({ success: true, data: updated, error: null, message: 'Feedback submitted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error', message: 'Something went wrong', data: null });
  }
};

export const getAllFeedback = async (req: Request, res: Response) => {
  try {
    const { category, status, sort, search, page = 1, limit = 10 } = req.query;
    const query: any = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { ai_summary: { $regex: search, $options: 'i' } },
    ];
    const sortOption: any = sort === 'priority' ? { ai_priority: -1 } : sort === 'sentiment' ? { ai_sentiment: 1 } : { createdAt: -1 };
    const skip = (Number(page) - 1) * Number(limit);
    const total = await Feedback.countDocuments(query);
    const feedbacks = await Feedback.find(query).sort(sortOption).skip(skip).limit(Number(limit));
    return res.status(200).json({ success: true, data: { feedbacks, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }, error: null, message: 'Feedback fetched' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error', message: 'Something went wrong', data: null });
  }
};

export const getFeedbackById = async (req: Request, res: Response) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, error: 'Not found', message: 'Feedback not found', data: null });
    return res.status(200).json({ success: true, data: feedback, error: null, message: 'Feedback fetched' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error', message: 'Something went wrong', data: null });
  }
};

export const updateFeedbackStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!feedback) return res.status(404).json({ success: false, error: 'Not found', message: 'Feedback not found', data: null });
    return res.status(200).json({ success: true, data: feedback, error: null, message: 'Status updated' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error', message: 'Something went wrong', data: null });
  }
};

export const deleteFeedback = async (req: Request, res: Response) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, error: 'Not found', message: 'Feedback not found', data: null });
    return res.status(200).json({ success: true, data: null, error: null, message: 'Feedback deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error', message: 'Something went wrong', data: null });
  }
};

export const reanalyze = async (req: Request, res: Response) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, error: 'Not found', message: 'Feedback not found', data: null });
    const aiResult = await analyzeWithGemini(feedback.title, feedback.description);
    if (aiResult) await Feedback.findByIdAndUpdate(feedback._id, aiResult);
    const updated = await Feedback.findById(feedback._id);
    return res.status(200).json({ success: true, data: updated, error: null, message: 'Reanalyzed successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error', message: 'Something went wrong', data: null });
  }
};

export const getSummary = async (req: Request, res: Response) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const feedbacks = await Feedback.find({ createdAt: { $gte: sevenDaysAgo } });
    if (feedbacks.length === 0) return res.status(200).json({ success: true, data: { summary: 'No feedback in the last 7 days.' }, error: null, message: 'Summary generated' });
    const combinedText = feedbacks.map(f => `Title: ${f.title}\nDescription: ${f.description}`).join('\n\n');
    const prompt = `Here is product feedback from the last 7 days:\n\n${combinedText}\n\nReturn ONLY valid JSON: { "themes": ["theme1", "theme2", "theme3"] }`;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
    );
    const data = await response.json() as any;
    const text = data.candidates[0].content.parts[0].text;
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return res.status(200).json({ success: true, data: parsed, error: null, message: 'Summary generated' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error', message: 'Something went wrong', data: null });
  }
};