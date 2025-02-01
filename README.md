# CareConnect

## Overview

CareConnect is a **centralized digital communication system** designed for care homes. It streamlines communication, ensures staff receive real-time updates, and enables acknowledgment tracking for accountability.

## Features

1. **Display Current Date and Time**:
    - The platform displays the current date and time on the main page and updates it every second.
2. **Update In-House and New Admissions Counts**:
    - Users can update the "In House" and "New Admissions" counts through a popup form. The updated counts are saved to the database and displayed on the main page.
3. **Add New Staff Members**:
    - Users can add new staff members by filling out a form in a popup. The new staff member's information is saved to the database.
4. **Categorized Information Cards**:
    - The main page displays three categories of information cards: Critical, Routine, and Event-Based. Clicking on a card redirects the user to a form page to submit new information for that category.
5. **Submit Information Forms**:
    - Users can submit information forms for different categories (Critical, Routine, Event-Based). The form includes fields for home, department, name, designation, information details, authorized by, state, and send to options. The submitted information is saved to the database.
6. **View Dashboard**:
    - Users can navigate to a dashboard page that displays categorized information (Critical, Routine, Event-Based) dynamically loaded from the database. The dashboard also shows the current date, time, in-house count, and new admissions count.
7. **Staff Dashboard**:
    - Users can navigate to a staff dashboard page that displays categorized information (Critical, Routine, Event-Based) dynamically loaded from the database. The staff dashboard also shows the current date, time, in-house count, and new admissions count.
8. **Acknowledge Information**:
    - Staff members can acknowledge information by selecting their name from a dropdown and clicking the acknowledge button. The acknowledgment is saved to the database, and the acknowledgment status is updated.
9. **View More Information**:
    - Users can view more details about a piece of information by clicking the "View More" button on the information card. This opens a modal with detailed information and acknowledgment status.
10. **Fetch and Display Counts**:
    - The platform fetches and displays the latest in-house and new admissions counts from the database when the page loads.
11. **Shared JavaScript Functions**:
    - The platform includes shared JavaScript functions for fetching and displaying counts, initializing the page, and handling form submissions.
12. **Responsive Design**:
    - The platform's design is responsive, ensuring proper rendering and usability on different devices and screen sizes.
*Note: More features and updates will be added as development progresses.*
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
📧 Email: [sumanthdev03@gmail.com](sumanthdev03@gmail.com)
🔗 LinkedIn: [Profile](https://linkedin.com/in/your-profile](https://www.linkedin.com/in/neil-sumanth-1306/)
