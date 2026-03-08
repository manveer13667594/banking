async function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!name || !email || !phone || !password || !confirmPassword) {
        alert("Please fill all fields");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }

    try {

        const response = await fetch("http://localhost:5000/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fullName: name,
                email: email,
                phone: phone,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {

           // alert("Account created successfully!");

            // redirect to login page
            window.location.href = "login.html";

        } else {
            alert(data.message || data.error || JSON.stringify(data));
        }

    } catch (error) {
        console.error(error);
        alert("Server error");
    }
}