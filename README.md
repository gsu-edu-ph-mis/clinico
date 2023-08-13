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