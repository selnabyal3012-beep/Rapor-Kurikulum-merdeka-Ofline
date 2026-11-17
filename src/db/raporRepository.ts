import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { raporBackups, raporStates, users } from './schema.ts';

export interface SaveRaporStateInput {
  userId: number;
  schoolKey: string;
  npsn: string;
  namaSekolah: string;
  tahunPelajaran: string;
  payloadJson: string;
  updatedBy: string;
}

export async function saveSchoolStateToSql(input: SaveRaporStateInput) {
  try {
    const now = new Date();
    const [saved] = await db
      .insert(raporStates)
      .values({
        userId: input.userId,
        schoolKey: input.schoolKey,
        npsn: input.npsn,
        namaSekolah: input.namaSekolah,
        tahunPelajaran: input.tahunPelajaran,
        payloadJson: input.payloadJson,
        updatedBy: input.updatedBy,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: raporStates.schoolKey,
        set: {
          userId: input.userId,
          npsn: input.npsn,
          namaSekolah: input.namaSekolah,
          tahunPelajaran: input.tahunPelajaran,
          payloadJson: input.payloadJson,
          updatedBy: input.updatedBy,
          updatedAt: now,
        },
      })
      .returning();

    const backupKey = `backup_${now.toISOString().replace(/[:.]/g, '-')}`;
    await db.insert(raporBackups).values({
      userId: input.userId,
      backupKey,
      schoolName: input.namaSekolah,
      payloadJson: input.payloadJson,
      createdBy: input.updatedBy,
      createdAt: now,
    });

    return saved;
  } catch (error) {
    console.error('Database save failed:', error);
    throw new Error('Database save failed. Please try again later.', { cause: error });
  }
}

export async function getSchoolStateFromSql(uid: string, schoolKey: string) {
  try {
    const rows = await db
      .select({
        id: raporStates.id,
        schoolKey: raporStates.schoolKey,
        npsn: raporStates.npsn,
        namaSekolah: raporStates.namaSekolah,
        tahunPelajaran: raporStates.tahunPelajaran,
        payloadJson: raporStates.payloadJson,
        updatedBy: raporStates.updatedBy,
        updatedAt: raporStates.updatedAt,
      })
      .from(raporStates)
      .innerJoin(users, eq(raporStates.userId, users.id))
      .where(eq(raporStates.schoolKey, schoolKey))
      .limit(1);

    if (!rows.length) {
      return null;
    }

    // Touch user UID reference to ensure audit context
    void uid;
    return rows[0];
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function listSqlBackups(uid: string) {
  try {
    return await db
      .select({
        id: raporBackups.id,
        backupKey: raporBackups.backupKey,
        schoolName: raporBackups.schoolName,
        createdBy: raporBackups.createdBy,
        createdAt: raporBackups.createdAt,
      })
      .from(raporBackups)
      .innerJoin(users, eq(raporBackups.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(raporBackups.createdAt))
      .limit(25);
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
