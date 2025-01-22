const InfoManager = {
  async fetchAndDisplayCounts() {
    try {
      const response = await fetch("/api/counts");
      if (!response.ok) throw new Error("Failed to fetch counts");
      const data = await response.json();
      document.getElementById("in-house-display").textContent = data.in_house;
      document.getElementById("new-admissions-display").textContent =
        data.new_admissions;
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  },
  init() {
    this.fetchAndDisplayCounts();
  },
};

document.addEventListener("DOMContentLoaded", () => {
  InfoManager.init();
});
