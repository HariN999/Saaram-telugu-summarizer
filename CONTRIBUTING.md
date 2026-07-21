# Contributing to Saaram

Thank you for your interest in contributing to **Saaram (సారం)**!

Saaram is an open-source Telugu news summarization and speech generation system designed for efficient deployment in low-resource environments. Contributions that improve the project, documentation, or developer experience are always welcome.

---

## Ways to Contribute

You can contribute by:

* Reporting bugs
* Suggesting new features
* Improving documentation
* Fixing issues
* Enhancing the frontend UI/UX
* Optimizing NLP models or inference
* Improving evaluation scripts
* Adding tests

---

## Getting Started

### 1. Fork the Repository

Click **Fork** at the top-right of this repository.

### 2. Clone Your Fork

```bash
git clone https://github.com/<your-username>/Saaram-telugu-summarizer.git
cd Saaram-telugu-summarizer
```

### 3. Create a Virtual Environment

```bash
python -m venv myenv
```

Activate it:

Linux/macOS

```bash
source myenv/bin/activate
```

Windows

```bash
myenv\Scripts\activate
```

### 4. Install Dependencies

Backend

```bash
pip install -r requirements.txt
```

Frontend

```bash
cd frontend
npm install
```

---

## Running the Project

### Backend

```bash
cd backend
uvicorn app:app --reload
```

### Frontend

```bash
cd frontend
npm run dev
```

---

## Development Guidelines

Please follow these guidelines when contributing:

* Keep pull requests focused on a single feature or fix.
* Write clear and descriptive commit messages.
* Update documentation when necessary.
* Preserve existing API behavior unless the change is intentional.
* Follow the project's coding style.
* Test your changes before opening a pull request.

---

## Pull Request Checklist

Before submitting a pull request, ensure that:

* [ ] The project builds successfully.
* [ ] Existing functionality is not broken.
* [ ] Documentation has been updated if needed.
* [ ] Your code has been tested locally.
* [ ] The pull request includes a clear description of the changes.

---

## Reporting Bugs

When opening an issue, please include:

* Operating system
* Browser (if frontend related)
* Python version
* Steps to reproduce
* Expected behavior
* Actual behavior
* Error logs or screenshots (if available)

---

## Feature Requests

Feature requests are welcome. Please describe:

* The problem you want to solve
* Your proposed solution
* Any alternative approaches considered

---

## Code of Conduct

Please be respectful and constructive in all discussions. We strive to maintain a welcoming and collaborative environment for everyone.

---

## Questions

If you have questions or would like to discuss a contribution before starting work, feel free to open an issue.

Thank you for helping improve **Saaram**!
