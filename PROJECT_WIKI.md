# 🚀 PPMetrics: The Scrum Master's Ultimate Cockpit

**PPMetrics** is a powerful, modern web application designed to empower Scrum Masters and Product Owners with real-time insights, budget tracking, and capacity planning. Built for speed and precision, it unifies data from Jira, Everhour, and internal planning to assist in data-driven decision making.

---

## ✨ Key Features

### 📊 **Interactive Dashboard**
- **Budget vs. Actuals**: Real-time tracking of financial health across all teams.
- **Visual Analytics**: Dynamic charts for velocity, capacity, and budget burn-up.
- **Team Insights**: Drill down into specific team performance and allocation (Dev, Maintenance, Management).

### 🎯 **Feature & Budget Planning**
- **PI Planning Support**: Manage Program Increment (PI) features with ease.
- **Budget Allocation**: Set and track budgets per feature and team.
- **Import/Export**: Seamlessly import data via CSV/JSON and export reports for stakeholders.
- **Jira Integration**: Import Epics and Stories directly to keep data synchronized.

### 📅 **Monatscontrolling (Monthly Control)**
- **Cumulative Metrics**: View aggregated data across all sprints in a PI.
- **Quality Metrics**: Track defect ratios, cycle times, and bug counts.
- **Automated Reporting**: Export monthly control data to CSV for external reporting.

### 👥 **Team Capacity Management**
- **Smart Allocations**: Input and visualize team availability and absence.
- **Sprint Planning**: Align planned Story Points (SP) with calculated capacity in hours.

---

## 🛠 Technical Stack

Built with a modern, high-performance stack ensuring speed and maintainability:

- **Frontend**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/) (Lightning fast SPA).
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a sleek, responsive, and premium UI.
- **State Management**: React Context API for lightweight global state.
- **Data Persistence**: [Firebase Firestore](https://firebase.google.com/) for real-time cloud database.
- **Hosting**: [Firebase Hosting](https://firebase.google.com/docs/hosting) (Global CDN).
- **CI/CD**: [Azure DevOps](https://azure.microsoft.com/en-us/services/devops/) Pipelines for automated build and deploy.

---

## 🚦 Getting Started (Developer Guide)

### Prerequisites
- Node.js (v20+)
- git

### Local Setup
1. **Clone the repository**:
   ```bash
   git clone https://polypoint@dev.azure.com/polypoint/scrum-mastering/_git/scrum-mastering
   cd scrum-mastering
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The app will run at `http://localhost:5173/`.

### Building for Production
```bash
npm run build
```
Artifacts are generated in the `dist/` folder.

---

## 🚢 Deployment Workflow

We use **Azure Pipelines** for Continuous Integration and **Firebase Hosting** for Continuous Deployment.

1. **Push to Main**: Any commit pushed to the `main` branch triggers the pipeline.
2. **Build**: Azure compiles the TypeScript/React code.
3. **Deploy**: The build artifact is automatically deployed to `https://metrics-96e88.web.app/`.

---

## 🔗 Quick Links
- **Live App**: [https://metrics-96e88.web.app/](https://metrics-96e88.web.app/)
- **Repository**: [Azure Repos](https://dev.azure.com/polypoint/scrum-mastering/_git/scrum-mastering)
- **Monatscontrolling**: [Direct Link](https://metrics-96e88.web.app/26.1/monatscontrolling)
