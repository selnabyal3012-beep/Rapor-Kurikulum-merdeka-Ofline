import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import {
  getSchoolStateFromSql,
  listSqlBackups,
  saveSchoolStateToSql,
} from './src/db/raporRepository.ts';

const PORT = 3000;
const SCHOOL_KEY = 'sdn_balil_current';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/rapor/state', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'operator@rapor.local';
      await getOrCreateUser(uid, email);

      const record = await getSchoolStateFromSql(uid, SCHOOL_KEY);
      if (!record) {
        return res.status(404).json({ error: 'No saved state found.' });
      }
      return res.json(record);
    } catch (error: any) {
      console.error('Failed to fetch rapor state:', error);
      return res.status(500).json({ error: error.message || 'Failed to load rapor data.' });
    }
  });

  app.put('/api/rapor/state', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'operator@rapor.local';
      const userRecord = await getOrCreateUser(uid, email);

      const { npsn, namaSekolah, tahunPelajaran, payloadJson } = req.body || {};
      if (!payloadJson || typeof payloadJson !== 'string') {
        return res.status(400).json({ error: 'Invalid payloadJson.' });
      }

      const saved = await saveSchoolStateToSql({
        userId: userRecord.id,
        schoolKey: SCHOOL_KEY,
        npsn: String(npsn || '69970290'),
        namaSekolah: String(namaSekolah || 'SD NEGERI BALIL'),
        tahunPelajaran: String(tahunPelajaran || '2026/2027'),
        payloadJson,
        updatedBy: email,
      });

      return res.json({
        success: true,
        updatedAt: saved.updatedAt,
      });
    } catch (error: any) {
      console.error('Failed to save rapor state:', error);
      return res.status(500).json({ error: error.message || 'Failed to save rapor data.' });
    }
  });

  app.get('/api/rapor/backups', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'operator@rapor.local';
      await getOrCreateUser(uid, email);

      const backups = await listSqlBackups(uid);
      return res.json(backups);
    } catch (error: any) {
      console.error('Failed to list backups:', error);
      return res.status(500).json({ error: error.message || 'Failed to list backups.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.get('/@vite/client', async (_req, res, next) => {
      try {
        const result = await vite.transformRequest('/@vite/client');
        if (!result) return next();
        const code = result.code
          .replace(
            'transport.connect(createHMRHandler(handleMessage));',
            '/* WebSocket HMR disabled */'
          )
          .replace(
            'else throw new SendBeforeConnectError("send was called before connect");',
            'else return;'
          )
          .replace(
            'else throw new SendBeforeConnectError("invoke was called before connect");',
            'else return;'
          )
          .replace('wsTransport.send(data);', '/* HMR send disabled */')
          .replace('await wsTransport.disconnect();', '/* HMR disconnect disabled */');
        res.setHeader('Content-Type', 'application/javascript');
        return res.send(code);
      } catch {
        return next();
      }
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve('dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
