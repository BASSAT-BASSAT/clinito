import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';

const convex = process.env.NEXT_PUBLIC_CONVEX_URL
  ? new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
  : null;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const patientId = searchParams.get('patientId');

  if (!patientId) {
    return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
  }

  if (!convex) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Get patient portfolio from Convex
    const portfolio = await convex.query(api.patients.getPatientPortfolio, {
      patientId: patientId as Id<'patients'>,
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Format patient context for Botpress
    const context = {
      patient: {
        name: `${portfolio.patient.firstName} ${portfolio.patient.lastName}`,
        id: portfolio.patient.patientId,
        age: calculateAge(portfolio.patient.dateOfBirth),
        gender: portfolio.patient.gender,
        bloodType: portfolio.patient.bloodType || 'Unknown',
        allergies: portfolio.patient.allergies || [],
        medicalHistory: portfolio.patient.medicalHistory || 'No prior history recorded',
      },
      recentSessions: portfolio.sessions?.slice(0, 5).map((s: any) => ({
        date: new Date(s.createdAt).toLocaleDateString(),
        prompt: s.segmentationPrompt,
        result: s.segmentationResult,
      })) || [],
      medications: portfolio.medications?.map((m: any) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
      })) || [],
      summaries: portfolio.summaries?.slice(0, 3).map((s: any) => ({
        date: new Date(s.createdAt).toLocaleDateString(),
        diagnosis: s.diagnosis,
        recommendations: s.recommendations,
      })) || [],
    };

    return NextResponse.json(context);
  } catch (error) {
    console.error('Error fetching patient context:', error);
    return NextResponse.json({ error: 'Failed to fetch patient data' }, { status: 500 });
  }
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
