'use client';

import { FormEvent, useState } from 'react';

type StoryBible = {
  universe_name: string | null;
  companion_name: string | null;
  companion_type: string | null;
  story_goal: string | null;
  current_chapter: number | null;
  memory: string | null;
};

type Story = {
  id: string;
  created_at: string;
  chapter_number: number | null;
  title: string | null;
  story_text: string | null;
  summary: string | null;
  status: string | null;
  email_status: string | null;
  sent_at: string | null;
};

type ChildRow = {
  id: string;
  created_at: string;
  parent_email: string;
  child_name: string;
  child_age: number;
  favorite_animal: string | null;
  favorite_color: string | null;
  interests: string | null;
  story_bibles?: StoryBible[];
  stories?: Story[];
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [rows, setRows]
