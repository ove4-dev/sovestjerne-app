  async function generateImagePrompt(storyId: string) {
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ storyId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kunne ikke generere bildeprompt.');
      }

      setMessage('Bildeprompt ble generert og lagret.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt.');
    }
  }
