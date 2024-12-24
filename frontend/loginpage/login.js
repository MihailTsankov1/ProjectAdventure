document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.form-container');
    const toggleRegister = document.querySelector('.toggle-register');
    const toggleLogin = document.querySelector('.toggle-login');

    toggleRegister.addEventListener('click', (e) => {
        e.preventDefault();
        container.style.transform = 'translateX(-50%)';
    });

    toggleLogin.addEventListener('click', (e) => {
        e.preventDefault();
        container.style.transform = 'translateX(0)';
    });
});
