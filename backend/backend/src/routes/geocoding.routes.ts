import { Router, Request, Response } from 'express';
import { geocodingService } from '../services/geocoding.service';

const router = Router();

// Search locations with suggestions
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || (req.query.query as string) || '';
    const limit = parseInt((req.query.limit as string) || '5', 10);

    if (!query || query.trim().length < 2) {
      return res.json({ success: true, data: [] });
    }

    const suggestions = await geocodingService.searchLocations(query, limit);
    return res.json({
      success: true,
      count: suggestions.length,
      data: suggestions,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Geocoding search failed',
      data: [],
    });
  }
});

// Reverse geocode
router.get('/reverse', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string || req.query.latitude as string);
    const lng = parseFloat(req.query.lng as string || req.query.lon as string || req.query.longitude as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude',
      });
    }

    const result = await geocodingService.reverseGeocode(lat, lng);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Reverse geocoding failed',
    });
  }
});

export default router;
