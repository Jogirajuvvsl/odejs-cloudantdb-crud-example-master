var express = require('express');
var cfenv = require('cfenv');
var app = express();
var request = require('request');
var Cloudant = require('cloudant');
var path = require('path');
var bodyParser = require('body-parser');
var json2csv = require('json2csv');
var fs = require('fs');
app.use(express.static(__dirname + '/public'));


app.use(bodyParser.json({limit: '50mb'}));
//app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
//To Store URL of Cloudant VCAP Services as found under environment variables on from App Overview page
var cloudant_url="https://7b459843-f6fb-4685-af1d-e8d0f77c5e27-bluemix:d34d8950d98d3445db14ef1272486392aedb6b9edb36c8c65c41b09fc269f8d1@7b459843-f6fb-4685-af1d-e8d0f77c5e27-bluemix.cloudant.com";
var services = JSON.parse(process.env.VCAP_SERVICES || "{}");
// Check if services are bound to your project
if(process.env.VCAP_SERVICES)
{
	services = JSON.parse(process.env.VCAP_SERVICES);
	if(services.cloudantNoSQLDB) //Check if cloudantNoSQLDB service is bound to your project
	{
		cloudant_url = services.cloudantNoSQLDB[0].credentials.url;  //Get URL and other paramters
		console.log("Name = " + services.cloudantNoSQLDB[0].name);
		console.log("URL = " + services.cloudantNoSQLDB[0].credentials.url);
        console.log("username = " + services.cloudantNoSQLDB[0].credentials.username);
		console.log("password = " + services.cloudantNoSQLDB[0].credentials.password);
	}
}

//Connect using cloudant npm and URL obtained from previous step
var cloudant = Cloudant({url: cloudant_url});
//Edit this variable value to change name of database.
//var dbname = 'estestframework';
var dbname = 'estest3ramework_database';
var db;


//Create database
cloudant.db.create(dbname, function(err, data) {
  	if(err) //If database already exists
	    console.log("Database exists. Error : ", err); //NOTE: A Database can be created through the GUI interface as well
  	else
	    console.log("Created database.");
    console.log("after Db creation");
  	//Use the database for further operations like create view, update doc., read doc., delete doc. etc, by assigning dbname to db.
  	db = cloudant.db.use(dbname);
    //Create a design document. It stores the structure of the database and contains the design and map of views too
    //A design doc. referred by _id = "_design/<any name your choose>"
    //A view is used to limit the amount of data returned
    //A design document is similar to inserting any other document, except _id starts with _design/.
    //Name of the view and database are the same. It can be changed if desired.
    //This view returns (i.e. emits) the id, revision number and new_city_name variable of all documents in the DB
	//Changed the view to store email id,mobile number and base64 image of the image added by jogi
  	db.insert(
	 {
		  	_id: "_design/estest3ramework_database",
		    views: {
	  				  "estest3ramework_database":
	  				   {
	      					"map": "function (doc) {\n  emit(doc._id, [doc._rev,doc.new_mobilenumber,doc.new_mailid,doc.new_image,doc.new_name]);\n}"
	    			   }
      	   		   }
     },
	 function(err, data) {
	    	if(err)
	    			console.log("View already exsits. Error: ", err); //NOTE: A View can be created through the GUI interface as well
	    	else
	    		console.log("estest3ramework_database view has been created");
	 });

});

//    ***************************************************** SEARCH DATABASE ************************************************************
////// To search for a document directly, without using request module....
////// It's crucial to know the ID of the document to be searched for.
////// TIP: While inserting a new document, a JSON object can be created with '_id' variable set to the same value as 'new_name' as in this case
////// This JSON document can be inserted whose _id can then be referenced for future search.
////// Eg: _id = "mydoc".
//
//	   db.get("mydoc", function(err, data){
//			if(!err)
//				console.log("Found document : " + JSON.stringify(data));
//  		else
//      		console.log("Document not found in database");
//	   });

//   ****************************************************** END OF SEARCH **************************************************************

app.get('/fill_remove_update_names_dropdown', function(req, res){
	console.log("To fill 'Update Names' and 'Remove Names' dropdown");
	var url = cloudant_url + "/estest3ramework_database/_design/estest3ramework_database/_view/estest3ramework_database";
	request({
			 url: url, //'request' makes a call to API URL which in turn returns a JSON to the variable 'body'
			 json: true
			}, function (error, response, body) {
		if (!error && response.statusCode === 200)
		{
			var user_data = body.rows; //body.rows contains an array of IDs, Revision numbers and Names from the view
			var list_of_names = '[';
			var name_array = [];

			//'user_data' is an array with all names
			for(var i=0; i< user_data.length; i++)
				name_array.push(user_data[i].value[4]);
			name_array.sort();
			for(var i=0; i<name_array.length; i++)
			{
				var name_JSON = '{\"name\":\"' + name_array[i] + '\"}'; //create an array of names only
				if(i !== 0)
					list_of_names = list_of_names.concat(",");
				list_of_names = list_of_names.concat(name_JSON);
			}
			list_of_names = list_of_names.concat("]");
			res.contentType('application/json');
			res.send(JSON.parse(list_of_names)); //Send names array to front end via res.send, which in turn populates drop down
		}
		else
		{
			console.log("No data from URL");
			console.log("Response is : " + response.statusCode);
			var name_string="{\"added\":\"DB read error\"}"; //Send error message in case 'request' can't read database
			res.contentType('application/json');
			res.send(JSON.parse(name_string));
		}
	});
});
app.get('/download_csv', function(req, res){
	var fileName = __dirname + '\/' + "database_names.csv";
	res.download(fileName);
});

//To update the 'Read Names' list
app.get('/view_names',function(req, res){
	var json_string_for_csv_conversion = new Array();
	var url = cloudant_url + "/estest3ramework_database/_design/estest3ramework_database/_view/estest3ramework_database";
	request({
			 url: url, //'request' makes a call to API URL which in turn returns a JSON to the variable 'body'
			 json: true
			}, function (error, response, body) {
		if (!error && response.statusCode === 200)
		{
			var user_data = body.rows;  //body.rows contains an array of IDs, Revision numbers and Names from the view
			var list_of_names = '[';
			var name_array = [];

			for(var i=0; i< user_data.length; i++)
			{
				name_array.push(user_data[i].value[1]);
				var csv_data = new Array();
				csv_data["|__Names_in_Database__|"]=user_data[i].value[1];
				json_string_for_csv_conversion.push(csv_data);
			}
			var download_filename = "database_names.csv";
			var fields =['|__Names_in_Database__|'];
			json2csv({data: json_string_for_csv_conversion, fields: fields }, function(err, csv) {
				if (err) console.log(err);
				fs.writeFile(download_filename, csv, function(err) {
					if (err) throw err;
					console.log('file saved');
					console.log(csv);

					fs.readdir(__dirname, function (err, files) {
						if (err)
							throw err;
						for (var index in files) {
							if(files[index] === download_filename)
								console.log(download_filename + " is present");
						}
					});
				});
			});

			name_array.sort();
			for(var i=0; i<name_array.length; i++)
			{
				var name_JSON = '{\"name\":\"' + name_array[i] + '\"}'; //create an array of names only
				if(i !== 0)
					list_of_names = list_of_names.concat(",");
				list_of_names = list_of_names.concat(name_JSON);
			}
			list_of_names = list_of_names.concat("]");
			res.contentType('application/json');
			console.log("Returning names");
			res.send(JSON.parse(list_of_names)); //return the list to front end for display
		}
		else
		{
			console.log("No data from URL");
			console.log("Response is : " + response.statusCode);
			var name_string="{\"added\":\"DB read error\"}"; //Send error message in case 'request' can't read database
			res.contentType('application/json');
			res.send(JSON.parse(name_string));
		}
	});
});
//changed from get to post to be abe to recieve large data from front end Added by Jogi
app.post('/add_name',function(req, res){ //to add a city into the database

    console.log("inside post")
	console.log("req is wihtout "+(req.new_name));
	var req1=JSON.parse(JSON.stringify(req.body));
    console.log("new name is "+req1.new_name);

	console.log("");
	//req.query.new_name = req.new_name.toUpperCase(); //convert to uppercase and trim white space before inserting
	//req.query.new_name = req.query.new_name.trim();
	  req1.new_name=req1.new_name.toUpperCase();
	  req1.new_name=req1.new_name.trim();

	//Search through the DB completely to check for duplicate name, before adding a new name
	var url = cloudant_url + "/estest3ramework_database/_design/estest3ramework_database/_view/estest3ramework_database";
	var name_present = 0; //flag variable for checking if name is already present before inserting
	var name_string; //variable to store update for front end.

	//In this case, check if the ID is already present, else, insert a new document
	request({
			 url: url,
			 json: true
			}, function (error, response, body) {
		if (!error && response.statusCode === 200)
		{
			//Check if current input is present in the table, else add. If present then return with error message
			var user_data = body.rows;
			console.log("length of table: " + user_data.length);
			var loop_len = user_data.length;
			for(var i=0; i< loop_len; i++)
			{
				var doc = user_data[i];
				console.log("in Db : " + doc.value[1]);
				if(req1.new_name === doc.value[1])
				{
					name_present = 1;
					break;
				}
			}
			if(name_present === 0) //if city is not already in the list
			{
				db.insert(req1, function(err, data){
					if (!err)
					{
						console.log("Added new name");
						name_string="{\"added\":\"Yes\"}";
						res.contentType('application/json'); //res.contentType and res.send is added inside every block as code returns immediately
						res.send(JSON.parse(name_string));
					}
					else
					{
						console.log("Error inserting into DB " + err);
						name_string="{\"added\":\"DB insert error\"}";
						res.contentType('application/json');
						res.send(JSON.parse(name_string));

					}
				});
		    }
			else
			{
				console.log("Name is already present");
				name_string="{\"added\":\"No\"}";
				res.contentType('application/json');
				res.send(JSON.parse(name_string));
			}
		}
		else
		{
			console.log("No data from URL. Response : " + response.statusCode);
			name_string="{\"added\":\"DB read error\"}";
			res.contentType('application/json');
			res.send(JSON.parse(name_string));
		}
	});
});
//added this function to get single user details to show in the read details form in front end Added by Jogi
app.get('/get_user_details',function(req, res){ //to update a city into the database
	
	var req=JSON.parse(JSON.stringify(req.query));
	console.log("Received : " + req.user_name);
	/*req.query.updated_new_name = req.query.updated_new_name.toUpperCase();
	req.query.updated_new_name = req.query.updated_new_name.trim();*/

	//Search through the DB completely to retrieve document ID and revision number
	var url = cloudant_url + "/estest3ramework_database/_design/estest3ramework_database/_view/estest3ramework_database";
	//var url = cloudant_url + "/estestframework/_design/estestframework/_view/estestframework";
	var name_present = 0;
	request({
			 url: url, //url returns doc id, revision number and name for each document
			 json: true
			}, function (error, response, body) {
			if (!error && response.statusCode === 200)
			{
				var name_string;
				var user_data = body.rows;
				console.log("User data"+user_data);
				var id_to_remove; //for updating, document ID is essential.
				//Format remains the same as adding new city name, except that document ID needs to be added
				var rev_to_remove;
				var total_rows = user_data.length;
				for(var i=0; i< user_data.length; i++)
				{
					var doc = user_data[i];
					if(doc.value[4] === req.user_name)
					{  console.log("user details are"+doc.value[0]+doc.value[1]+doc.value[2]+doc.value[3]+doc.value[4]);
						var json_res={"new_mobilenumber":doc.value[1],"new_mailid":doc.value[2],"new_image":doc.value[3]};
					    console.log("json done");
						console.log(json_res);
						res.send(json_res);
						console.log("send");
						break;
					}
					
				}
				//create a document object before updating, containing ID of the doc. that needs to be updated, revision number and new name
			    //var string_to_update = "{\"new_name\":\"" + req.query.updated_new_name + "\",\"_id\":\"" +id_to_remove+"\",\"_rev\":\"" + rev_to_remove + "\"}";
			    //var update_obj = JSON.parse(string_to_update);
				//if update name is not equal to existing name and database isn't empty then update document, else print error message
				/*if(total_rows !== 0)
				{
					if(name_present === 0)
					{
						db.insert(update_obj, function(err, data)
						{
								if(!err)
								{
									console.log("Updated doc.");
									name_string="{\"updated\":\"updated\"}";
									res.contentType('application/json');//res.contentType and res.send is added inside every block as code returns immediately
									res.send(JSON.parse(name_string));
								}
								else
								{
									console.log("Couldn't update name " + err);
									name_string="{\"updated\":\"could not update\"}";
									res.contentType('application/json');
									res.send(JSON.parse(name_string));
								}
						});
					}
					else
					{
						console.log("Duplicate city");
						name_string="{\"updated\":\"No\"}";
						res.contentType('application/json');
						res.send(JSON.parse(name_string));
					}

				}
				else
				{
					console.log("DB is empty");
					var name_string="{\"updated\":\"empty database\"}";
					res.contentType('application/json');
					res.send(JSON.parse(name_string));
				}*/
			}
			else
			{
				console.log("No response from URL. Status : " + response.statusCode);
				console.log("error is "+error);
				name_string="{\"updated\":\"DB read error\"}";
				res.contentType('application/json');
				//res.send(JSON.parse(name_string));
			}
	});
});

app.get('/update_name',function(req, res){ //to update a city into the database
	console.log("Received : " + JSON.stringify(req.query));
	req.query.updated_new_name = req.query.updated_new_name.toUpperCase();
	req.query.updated_new_name = req.query.updated_new_name.trim();

	//Search through the DB completely to retrieve document ID and revision number
	var url = cloudant_url + "/estest3ramework_database/_design/estest3ramework_database/_view/estest3ramework_database";
	var name_present = 0;
	request({
			 url: url, //url returns doc id, revision number and name for each document
			 json: true
			}, function (error, response, body) {
			if (!error && response.statusCode === 200)
			{
				var name_string;
				var user_data = body.rows;
				var id_to_remove; //for updating, document ID is essential.
				//Format remains the same as adding new city name, except that document ID needs to be added
				var rev_to_remove;
				var total_rows = user_data.length;
				for(var i=0; i< user_data.length; i++)
				{
					var doc = user_data[i];
					if(doc.value[1] === req.query.name_list)
					{
						id_to_remove = doc.key;
						rev_to_remove = doc.value[0];
					}
					if(doc.value[1] === req.query.updated_new_name)
					{
						name_present = 1;
						break;
					}
				}
				//create a document object before updating, containing ID of the doc. that needs to be updated, revision number and new name
			    var string_to_update = "{\"new_name\":\"" + req.query.updated_new_name + "\",\"_id\":\"" +id_to_remove+"\",\"_rev\":\"" + rev_to_remove + "\"}";
			    var update_obj = JSON.parse(string_to_update);
				//if update name is not equal to existing name and database isn't empty then update document, else print error message
				if(total_rows !== 0)
				{
					if(name_present === 0)
					{
						db.insert(update_obj, function(err, data)
						{
								if(!err)
								{
									console.log("Updated doc.");
									name_string="{\"updated\":\"updated\"}";
									res.contentType('application/json');//res.contentType and res.send is added inside every block as code returns immediately
									res.send(JSON.parse(name_string));
								}
								else
								{
									console.log("Couldn't update name " + err);
									name_string="{\"updated\":\"could not update\"}";
									res.contentType('application/json');
									res.send(JSON.parse(name_string));
								}
						});
					}
					else
					{
						console.log("Duplicate city");
						name_string="{\"updated\":\"No\"}";
						res.contentType('application/json');
						res.send(JSON.parse(name_string));
					}

				}
				else
				{
					console.log("DB is empty");
					var name_string="{\"updated\":\"empty database\"}";
					res.contentType('application/json');
					res.send(JSON.parse(name_string));
				}
			}
			else
			{
				console.log("No response from URL. Status : " + response.statusCode);
				name_string="{\"updated\":\"DB read error\"}";
				res.contentType('application/json');
				res.send(JSON.parse(name_string));
			}
	});
});

app.get('/remove_name',function(req, res){ //to update a city into the database
	console.log("Name to be removed : = " + req.query.name_to_remove);
	//Search through the DB completely to retrieve document ID and revision number
	var url = cloudant_url + "/estest3ramework_database/_design/estest3ramework_database/_view/estest3ramework_database";
	request({
			 url: url, //url returns doc id, revision number and name for each document
			 json: true
			}, function (error, response, body) {
			if (!error && response.statusCode === 200)
			{
				var name_string;
				var user_data = body.rows;
				var id_to_remove;
				var rev_to_remove; //for removing, ID and revision number are essential.
				var total_rows = user_data.length;
				for(var i=0; i< user_data.length; i++)
				{
					var doc = user_data[i];
					if(doc.value[1] === req.query.name_to_remove)
					{
						id_to_remove = doc.key;
						rev_to_remove = doc.value[0];
						break;
					}
				}
				if(total_rows !== 0)
				{
				    db.destroy(id_to_remove, rev_to_remove, function(err)
				    {
						if(!err)
						{
							console.log("Removed name");
							name_string="{\"removed\":\"removed\"}";
							res.contentType('application/json');
							res.send(JSON.parse(name_string));
						}
						else
						{
							console.log("Couldn't remove name");
							console.log(err);
							name_string="{\"removed\":\"could not remove\"}";
							res.contentType('application/json');
							res.send(JSON.parse(name_string));
						}
					});

				}
				else
				{
					console.log("DB is empty");
					name_string="{\"removed\":\"empty database\"}";
					res.contentType('application/json');
					res.send(JSON.parse(name_string));
				}
			}
			else
			{
				console.log("No data from URL");
				console.log("Response is : " + response.statusCode);
				name_string="{\"removed\":\"DB read error\"}";
				res.contentType('application/json');
				res.send(JSON.parse(name_string));
			}
	});

});

var appEnv = cfenv.getAppEnv();
app.listen(appEnv.port, '0.0.0.0', function() {
  console.log("server starting on " + appEnv.url);
});