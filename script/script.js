// Mobile Navigation Toggle
const burger = document.querySelector(".burger");
const navLinks = document.querySelector(".nav-links");
const navLinksItems = document.querySelectorAll(".nav-links li");

burger.addEventListener("click", () => {
  // Toggle Navigation
  navLinks.classList.toggle("active");

  // Burger Animation
  burger.classList.toggle("toggle");
});

// Close mobile menu when clicking on a link
navLinksItems.forEach((item) => {
  item.addEventListener("click", () => {
    navLinks.classList.remove("active");
    burger.classList.remove("toggle");
  });
});

// Smooth Scrolling for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      const offset = 80; // Height of fixed navbar
      const targetPosition = target.offsetTop - offset;
      window.scrollTo({
        top: targetPosition,
        behavior: "smooth",
      });
    }
  });
});

// Initialize EmailJS
// Remplace 'YOUR_PUBLIC_KEY' par ta clé publique EmailJS (https://dashboard.emailjs.com/admin/account)
emailjs.init("cTA3u9VHI2YgJeaLI");

// Form Submission Handler
const contactForm = document.querySelector(".contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();

    if (!name || !email || !message) {
      alert("Please fill in all fields.");
      return;
    }

    const submitBtn = contactForm.querySelector(".submit-button");
    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    // Remplace 'YOUR_SERVICE_ID' et 'YOUR_TEMPLATE_ID' par tes identifiants EmailJS
    emailjs
      .sendForm("service_cr3xou8", "template_5av8ez8", this)
      .then(() => {
        alert("Message sent! I will get back to you soon.");
        contactForm.reset();
      })
      .catch((error) => {
        console.error("EmailJS error:", error);
        alert(
          "Failed to send message. Please try again or contact me directly at vdenoyelle45@gmail.com.",
        );
      })
      .finally(() => {
        submitBtn.textContent = "Send Message";
        submitBtn.disabled = false;
      });
  });
}

// Add animation on scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -100px 0px",
};

const observer = new IntersectionObserver(function (entries) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);

// Observe all section elements
document.querySelectorAll("section").forEach((section) => {
  section.style.opacity = "0";
  section.style.transform = "translateY(20px)";
  section.style.transition = "opacity 0.6s ease, transform 0.6s ease";
  observer.observe(section);
});

// Active Navigation Link Highlighting
window.addEventListener("scroll", () => {
  let current = "";
  const sections = document.querySelectorAll("section");

  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (scrollY >= sectionTop - 100) {
      current = section.getAttribute("id");
    }
  });

  navLinksItems.forEach((li) => {
    const link = li.querySelector("a");
    link.classList.remove("active");
    if (link.getAttribute("href").slice(1) === current) {
      link.classList.add("active");
    }
  });
});
