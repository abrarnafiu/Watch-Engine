import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { jest } from '@jest/globals';
import http from 'http';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                'Dial Color': 'blue',
                'Type': 'chronograph',
                'Price': 'under 10000'
              })
            }
          }]
        })
      }
    }
  }))
}));

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-api-key';

// Import your server
import app from './server.js';

describe('Backend API Tests', () => {
  describe('POST /api/analyze-query', () => {
    it('should analyze a valid query', async () => {
      const response = await request(app)
        .post('/api/analyze-query')
        .send({ query: 'Find me a blue chronograph under 10000' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('Dial Color', 'blue');
      expect(response.body.data).toHaveProperty('Features', "chronograph");
      expect(response.body.data).toHaveProperty('Price', 'under 10000');
    });

    it('should handle missing query parameter', async () => {
      const response = await request(app)
        .post('/api/analyze-query')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid query parameter');
    });

    it('should handle simple queries', async () => {
      const response = await request(app)
        .post('/api/analyze-query')
        .send({ query: 'find me a watch' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('Type', 'any');
    });
  });

  describe('GET /api/proxy-image', () => {
    it('should handle missing URL parameter', async () => {
      const response = await request(app)
        .get('/api/proxy-image')
        .expect(400);

      expect(response.body.error).toBe('Image URL is required');
    });

    it('should reject invalid image sources', async () => {
      const response = await request(app)
        .get('/api/proxy-image?url=https://invalid-domain.com/image.jpg')
        .expect(400);

      expect(response.body.error).toBe('Invalid image source');
    });

    it('should handle valid image URLs', async () => {
      // Mock the http.get response
      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'image/jpeg' },
        pipe: jest.fn()
      };

      http.get = jest.fn().mockImplementation((url, callback) => {
        callback(mockResponse);
        return {
          on: jest.fn(),
          destroy: jest.fn()
        };
      });

      const response = await request(app)
        .get('/api/proxy-image?url=https://api-watches-v2.makingdatameaningful.com/files/watches/123/image.jpg')
        .expect(200);

      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.headers['cache-control']).toBe('public, max-age=86400');
    }, 30000);
  });

  describe('Rate Limiting', () => {
    it('should limit requests within the time window', async () => {
      // Make multiple requests in quick succession
      const requests = Array(101).fill().map(() => 
        request(app)
          .post('/api/analyze-query')
          .send({ query: 'test query' })
      );

      const responses = await Promise.all(requests);
      
      // Check that some requests were rate limited
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
}); 