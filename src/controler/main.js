"use strict";
const FORM_ENDPOINT = "https://formspree.io/f/xzzyaabb";
document.addEventListener("DOMContentLoaded", () => {
  const shapes = Array.from(document.querySelectorAll(".shape"));
  window.addEventListener("mousemove", (e) => {
    const xRatio = e.clientX / window.innerWidth - 0.5;
    const yRatio = e.clientY / window.innerHeight - 0.5;
    shapes.forEach((shape) => {
      const speed = parseFloat(shape.dataset.speed || "0.2");
      const translateX = -xRatio * 40 * speed;
      const translateY = -yRatio * 40 * speed;
      shape.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
    });
  });
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear().toString();
  }
  const form = document.getElementById("contact-form");
  const statusEl = document.getElementById("form-status");
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!statusEl) return;
      statusEl.textContent = "Envoi en cours...";
      const formData = new FormData(form);
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
          },
        });
        if (res.ok) {
          statusEl.textContent = "Merci, ton message a bien été envoyé.";
          form.reset();
        } else {
          statusEl.textContent = "Erreur lors de l’envoi. Réessaie plus tard.";
        }
      } catch (error) {
        console.error(error);
        statusEl.textContent = "Erreur réseau. Vérifie ta connexion.";
      }
    });
  }
});
