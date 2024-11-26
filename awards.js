fetch('/api/awards')
    .then((response) => response.json())
    .then((data) => {
        const awardsSection = document.querySelector('.awards');
        data.awards.forEach((award) => {
            const awardDiv = document.createElement('div');
            awardDiv.className = 'award';
            awardDiv.innerHTML = `
                <h3>${award.title}</h3>
                <p>${award.description}</p>
            `;
            awardsSection.appendChild(awardDiv);
        });
    })
    .catch((err) => console.error('Error fetching awards:', err));
