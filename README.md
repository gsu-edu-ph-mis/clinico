# Clinic Online
An online information system for the university medical record


## Database

##### Authenticate

	use admin
	db.auth("uRoot", "{get password from credentials.json}" )
  
## Create Regular Users
These are the regular users used by web apps to connect to the database. They only have the least amount of capabilities to work properly.

Switch to database:

    use clinico

Create user:

	db.createUser(
		{
			user: "uClinico",
			pwd: "{get password from credentials.json}",
			roles: [ 
		      { 
		        role: "readWrite", 
		        db: "clinico" 
		      }
		    ]
		}
	)


## Install

	git clone https://github.com/gsu-edu-ph-mis/clinico.git
	cd clinico
	npm install

	cd credentials
	sudo nano credentials.live.json
	cd ..



	sudo nano /etc/nginx/sites-available/clinic.gsu.edu.ph

	sudo ln -s /etc/nginx/sites-available/clinic.gsu.edu.ph /etc/nginx/sites-enabled/