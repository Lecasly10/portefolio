// app/page.tsx
'use client';

import { FormEvent, useState } from 'react';

export default function HomePage() {
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('Envoi en cours...');

    const formData = new FormData(e.currentTarget);

    const res = await fetch('/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      setStatus('Message envoyé, merci !');
      e.currentTarget.reset();
    } else {
      setStatus("Erreur lors de l'envoi, réessaie plus tard.");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <section className="w-full max-w-xl space-y-6">
        <h1 className="text-3xl font-bold text-center">
          Lecasly – Développeur
        </h1>

        {/* ici tu rajouteras sections Projets / À propos, etc. */}

        <h2 className="text-xl font-semibold mt-8">Me contacter</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm" htmlFor="name">
              Nom
            </label>
            <input
              id="name"
              name="name"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm" htmlFor="message">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded bg-black text-white text-sm"
          >
            Envoyer
          </button>

          {status && <p className="text-sm mt-2">{status}</p>}
        </form>
      </section>
    </main>
  );
}
