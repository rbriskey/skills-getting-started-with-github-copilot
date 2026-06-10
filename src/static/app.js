document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and activity select (avoid duplicate options on refresh)
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML = (details.participants && details.participants.length) ?
          '<div class="participants"><strong>Participants:</strong><ul class="participants-list">' +
            details.participants.map(function(p){ return '<li class="participant-item" data-email="' + p + '"><span class="participant-email">' + p + '</span><button class="participant-remove" title="Remove participant">✖</button></li>'; }).join('') +
          '</ul></div>' :
          '<div class="participants none"><em>No participants yet</em></div>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Attach remove handlers for participant buttons
        activityCard.querySelectorAll('.participant-remove').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const li = e.currentTarget.closest('.participant-item');
            if (!li) return;
            const email = li.dataset.email;
            try {
              const res = await fetch(`/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(email)}`, {
                method: 'DELETE'
              });
              const json = await res.json();
              if (res.ok) {
                // remove from DOM
                const ul = activityCard.querySelector('.participants-list');
                li.remove();
                // update availability
                const avail = activityCard.querySelector('.availability');
                if (avail) {
                  const m = avail.textContent.match(/(\d+)/);
                  if (m) {
                    const newVal = parseInt(m[1], 10) + 1;
                    avail.innerHTML = '<strong>Availability:</strong> ' + newVal + ' spots left';
                  }
                }
                // show 'no participants' if list empty
                if (ul && ul.children.length === 0) {
                  const parts = activityCard.querySelector('.participants');
                  if (parts) parts.innerHTML = '<em>No participants yet</em>';
                }
                messageDiv.textContent = json.message;
                messageDiv.className = 'success';
              } else {
                messageDiv.textContent = json.detail || 'Failed to remove participant';
                messageDiv.className = 'error';
              }
            } catch (err) {
              messageDiv.textContent = 'Error removing participant';
              messageDiv.className = 'error';
              console.error('Error removing participant:', err);
            }
            messageDiv.classList.remove('hidden');
            setTimeout(() => messageDiv.classList.add('hidden'), 4000);
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the newly-registered participant appears immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
