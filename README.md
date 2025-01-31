# CareConnect

## Overview

CareConnect is a **centralized digital communication system** designed for care homes. It streamlines communication, ensures staff receive real-time updates, and enables acknowledgment tracking for accountability.

## Features

-   **Real-Time Updates**: Displays the current date and time, refreshing every second.
-   **Manage Admissions**: Update and track "In House" and "New Admissions" counts.
-   **Staff Management**: Add new staff members via a user-friendly form.
-   **Categorized Information**: Supports **Critical, Routine, and Event-Based** information cards.
-   **Submit Information Forms**: Staff can submit updates with structured form fields.
-   **Dashboards**: Interactive dashboards for staff and management with real-time updates.
-   **Acknowledgment Tracking**: Staff can acknowledge information, and the system logs it.
-   **Information Details**: View additional details on submitted updates via a modal popup.
-   **Database Integration**: Fetches and updates counts dynamically from MySQL.
-   **Responsive Design**: Ensures compatibility across desktop, tablet, and mobile devices.

## Tech Stack

### Frontend

-   **HTML, CSS, JavaScript** (Custom styles and interactivity)
-   **Font Awesome, Google Fonts** (Icons and typography)

### Backend

-   **Node.js, Express.js** (Server and API handling)
-   **MySQL, MySQL2** (Database and queries)
-   **dotenv, body-parser, cors** (Middleware and security)

### Hosting & Scalability

-   **AWS/Azure** (Cloud hosting)
-   **Role-based authentication & encryption** (Security)
-   **Real-time updates via WebSockets**

## Installation

### Prerequisites

Ensure you have the following installed:

-   [Node.js](https://nodejs.org/)
-   [MySQL](https://www.mysql.com/)
-   A package manager (**npm** or **yarn**)

### Setup Instructions

1.  **Clone the repository**

    ```sh
    git clone https://github.com/yourusername/CareConnect.git
    cd CareConnect
    ```

2.  **Install dependencies**

    ```sh
    npm install
    ```

3.  **Set up environment variables**
    Create a `.env` file in the root directory and configure:

    ```ini
    DB_HOST=your_database_host
    DB_USER=your_database_user
    DB_PASSWORD=your_database_password
    DB_NAME=careconnect_db
    ```

4.  **Run the database migration (if applicable)**

    ```sh
    node test-db.js
    ```

5.  **Start the server**

    ```sh
    npm start
    ```

    The backend will start at `http://localhost:3000`.

6.  **Open the frontend**
    -   Navigate to `http://localhost:3000` in your browser.

## Project Structure

```
CareConnect/
│── config/         # Database configuration
│── public/         # Static files (HTML, CSS, JS)
│── routes/         # API routes
│── server.js       # Express server setup
│── test-db.js      # Database connection test script
│── package.json    # Project dependencies
│── .env.example    # Environment variable example
│── README.md       # Project documentation
```

## Future Enhancements

-   **Integration with Medical Records**
-   **Automated Reminders & Escalations**
-   **Mobile App Support**
-   **Advanced Reporting & Analytics**

## Contributing

Contributions are welcome!

1.  Fork the repository
2.  Create a feature branch (`git checkout -b feature-name`)
3.  Commit your changes (`git commit -m "Add new feature"`)
4.  Push to the branch (`git push origin feature-name`)
5.  Open a pull request

## License

This project is licensed under the **MIT License**.

## Contact

For any questions or feedback, feel free to reach out:
📧 Email: [your-email@example.com](mailto:your-email@example.com)
🔗 LinkedIn: [your-profile](https://linkedin.com/in/your-profile)
