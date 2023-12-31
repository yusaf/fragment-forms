# Fragment Forms 

Fragment forms **is framework agnostic** and can be used as is, however it was designed to be used as scaffolding to build framework specific libraries.

Fragment forms is a new approach to handling forms by taking advantage of the name attribute with a few naming conventions! 

Fragment forms offers:
- Form submissions - with support for progressive enhancement and form re-population.
- Zod validation - validate your data on the front end before you ever send it to the backend.
- FormData to object with types coerced -  FormData is converted to an object with string values coerced to `numbers`, `booleans` and `date`.
- Autosaving form changes - changes (fragments) are only saved when there's an **ACTUAL** change to the form.
- Form change fragments - only the fields that changed and pass validation get submitted and not the entire form.
- Form change fragments bundling - all field changes within a specified timeframe are bundled together so only 1 request is made with all the changes.



## Naming conventions
Fragment forms knows how to structure your data into an object and what types to coerce to using the `[name]` attribute's value

### Objects

Creating objects is easy, nested poperties are created by using `.` (dot).

e.g. the following form
```html
<form method="POST">
    First name:<input name="name.first"><br>
    Last name:<input name="name.last"><br>
    <input type="submit">
</form>
```

FormData is converted on the backend to
```js
import { formToJSON } from 'fragment-forms';

const data = /* formToJSON(formData)*/ {
    name: {
        first:"Yusaf",
        last:"Khaliq"
    }
}
```

### Types

For a field to be coerced to a specific type you need to add the `(type)` onto the end of the name in brackets e.g. `name="agree(boolean)"`
```html
<form method="POST">
    First name:<input name="name.first"><br>
    Last name:<input name="name.last"><br>
    Age: <input name="age(number)" type="number"><br>
    Date of birth <input name="dob(date)" type="date"><br>
    Date and time of birth: <input name="dobat(dateTime)" type="datetime-local"><br>
    Agree to storing your data: <input name="agree(boolean)" type="checkbox" value="true"><br>
    <input type="submit">
</form>
```
```js
// below is an example for the const data 
const data = {
    name:{
        first:"Yusaf", //By default all name's without a type are assumed to be (string)
        last:"Khaliq"
    },
    age: 20, // (number) will convert to a number or NaN if the value is not a number
    dob: Date, // '1990-01-01T00:00:00.000Z' (date) will always have time set to 00:00
    dobat: Date // '1990-01-101T19:09:33.000Z' (dateTime) will always include time
    agree: true // A value of "false" is considered false, "true" is true
}
```
The built in types that are supported include `(string)`, `(boolean)`, `(number)`, `(date)`, `(dateTime)`

### Arrays

Data can be structured into arrays by using square brackets with `[index]`

Stating the `[index]` is required (as shown in the below) if data within the array is objects
```html
<form method="POST">
	Child 1<br />
	First name:<input name="children[0].name.first" /><br />
	Last name:<input name="children[0].name.last" /><br />
	Sex: Male<input name="children[0].sex" value="male" type="radio" /> Female<input
		name="children[0].sex"
		value="female"
		type="radio"
	/>
	<br />
	Child 2<br />
	First name:<input name="children[1].name.first" /><br />
	Last name:<input name="children[1].name.last" /><br />
	Sex: Male<input name="children[1].sex" value="male" type="radio" /> Female<input
		name="children[1].sex"
		value="female"
		type="radio"
	/>
	<br />
	<input type="submit" />
</form>
```
```js
// below is an example for the const data 
const data = {
   children:[
    {
        name: {first:"first", last:"child"},
        sex:"male"
    },
    {
        name: {first:"second", last:"child"},
        sex:"female"
    }
   ]
}
```

**However**, if the arrays is made of all primitive types e.g. `string`, `boolean` etc, then no-index arrays `[]` is also possible

> Note: You can still coerce the types in no-index array as follows `dates[](date)`

```html
<form method="POST">
    Communication preferences:
    SMS:<input name="commpref[]" type="checkbox" value="SMS"><br>
    E-Mail:<input name="commpref[]" type="checkbox" value="email"><br>
    Letter:<input name="commpref[]" type="checkbox" value="letter"><br>
    <input type="submit">
</form>
```
```js
// below is an example for the const data 
const data = {
   commpref:["SMS", "letter"]
}
```

### Always include prefix (`_$`)

When changes are made, only the specific fields that have changed are saved, but what if we need additional context to know what changed?

For e.g. we have the following form populated with exisiting data from a database

```html
<form method="POST">
	Child 1 <input name="children[0].id" value="child-1-random-uuid" type="hidden" /><br />
	First name:<input name="children[0].name.first" value="Emily" /><br />
	Last name:<input name="children[0].name.last" value="Brown" /><br />
	Sex: Male<input name="children[0].sex" value="male" type="radio" /> Female<input
		name="children[0].sex"
		value="female"
		type="radio"
		checked
	/>
	<br />
	Child 2 <input name="children[1].id" value="child-2-random-uuid" type="hidden" /><br />
	First name:<input name="children[1].name.first" value="Bobby" /><br />
	Last name:<input name="children[1].name.last" value="Brown" /><br />
	Sex: Male<input name="children[1].sex" value="male" type="radio" checked /> Female<input
		name="children[1].sex"
		value="female"
		type="radio"
	/>
	<br />
	<input type="submit" />
</form>
```

Let's say we change the value of `<input name="children[1].name.last" value="Brown"/>` to `value="Smith"`

The fragment would look something like this
```js
const fragment = {
    children:[
        0:empty,
        1:{
            name:{
                last:"Smith"
            }
        }
    ]
}
```

But how do we know exactly which child was updated?

This is where the always include prefix (`_$`)  comes in handy

Now let's add the always include prefix (`_$`) to our hidden input's name, changing from `"children[1].id"` to `"children[1]._$id"`

The fragment will now look like:
```js
const fragment = {
    children:[
        0:empty,
        1:{
            id: "child-2-random-uuid", // we now have an id for context on which child was changed
            name:{
                last:"Smith"
            }
        }
    ]
}
```

The always prefix works for all direct ancestors too! 

And you can also opt in the entire object by prefixing with `_$`

e.g. let's also add a  hidden input with the name `"_$parentId"` and prefix `.name`

```html
<form method="POST">
    <input name="_$parentId" value="parent-random-uuid" type="hidden" /><br />

	Child 1 <input name="children[0]._$id" value="child-1-random-uuid" type="hidden" /><br />
	First name:<input name="children[0]._$name.first" value="Emily" /><br />
	Last name:<input name="children[0]._$name.last" value="Brown" /><br />
	Sex: Male<input name="children[0].sex" value="male" type="radio" /> Female<input
		name="children[0].sex"
		value="female"
		type="radio"
		checked
	/>
	<br />
	Child 2 <input name="children[1]._$id" value="child-2-random-uuid" type="hidden" /><br />
	First name:<input name="children[1]._$name.first" value="Bobby" /><br />
	Last name:<input name="children[1]._$name.last" value="Brown" /><br />
	Sex: Male<input name="children[1].sex" value="male" type="radio" checked /> Female<input
		name="children[1].sex"
		value="female"
		type="radio"
	/>
	<br />
	<input type="submit" />
</form>
```
When a we change the value "Brown" to "Smith" now, the fragment will look like:
```js
const fragment = {
    parentId:"parent-random-uuid",
    children:[
        0:empty,
        1:{
            id: "child-2-random-uuid",
            name: {first:"Bobby", last:"Smith"},
        }
   ]
}
```


## Frontend usage

### Creating our FragmentForms object

The most minimal implementation requires 0 options.
```ts
const FF = new FragmentForms();
```

All options
```ts
const FF = new FragmentForms({
    schema: ZodSchema; //Default is an internal zod schema which ensures your data remains in a suitable format
    saveSchema: ZodSchemaPartial; // Unless provided, the schema provided in "schema" will be converted to deep partial for saveSchema
    debounce: 500; // default is 500 (0.5s)
    autoSaveTimeout: 0; // default is 0 (disabled), provide a number greater than debounce
    save: false; // default is false, true to enable saving fragments
    data: null; // default is null. Provide and object you wish to populate the form with initially e.g. in progressive enhancement
    submitSuccessTimeout: 0; // default is 0 (no timer).
    saveSuccessTimeout: 3000; //default is 3000 (3s),
    enhance: true // default is true. If false, form submit events will not be intercepted and will have usual browser submit behaviour
});
```

### Attaching the form
The first thing we need to do is attach our form like so:
```ts
FF.form( document.querySelector("form") )
```
This will then attach all the internal event listeners etc.


### Pre-filling attributes
Now we need create to an `attrs` function that will create the attributes for our fields.

#### Empty form
```ts
const attrs = FF.attributes();
```	

#### Form with value population
```ts
import { FragmentForm } from 'fragment-forms';
const FF = new FragmentForms({
    data: {
        existing:{
            data:true
        }
    }
});
const attrs = FF.attributes();
```	

#### Using the attrs function
`attrs` accepts 3 arguments `name`, `type` and `value/additional attrs`
- `name` (required) - must be the name of the field using the naming conventions
- `type` (required) - must be an input type e.g. `"checkbox"` or the elements `select`, `option` and `textarea`
- `value/additional attrs` (optional)
  - Value can be the default value for types that aren't user provided e.g. `"checkbox"`, `"radio"`, `"option"`
  - The value sould also be the coerce type for that field e.g. an input with the name `"agree(boolean)"` the value should be set as `true`
  - Value can also be and object with key pair values representing attributes you wish to set to the element

#### Attrs practical usage ( svelte example )
```svelte
<form method="POST">
	<input {...attrs('_$id', 'hidden')} /><br />
	<br />
	Username:<br />
	<input {...attrs('username', 'text')} /><br />
	<br />
	Password:<br />
	<input {...attrs('password', 'password')} /><br />
	<br />
	Name:<br />
	First: <input {...attrs('user.name.first', 'text')} /><br />
	Second: <input {...attrs('user.name.second', 'text')} /><br />
	<br />
	Sex:<br />
	Male: <input {...attrs('user.sex', 'radio', 'male')} /><br />
	Female: <input {...attrs('user.sex', 'radio', 'female')} /><br />
	<br />
	Date Of Birth:
	<input {...attrs('user.dob(date)', 'date')} /><br />
	<br />
	Interests<br />
	Sports:<input {...attrs('user.interests[]', 'checkbox', 'sports')} /><br />
	Politics:<input {...attrs('user.interests[]', 'checkbox', 'politics')} /><br />
	Finance:<input {...attrs('user.interests[]', 'checkbox', 'finance')} /><br />
	<br />
	Contact preferences:<br />
	<select {...attrs('user.contact[]', 'select')}>
		<option {...attrs('user.contact[]', 'option', 'sms')}>SMS</option>
		<option {...attrs('user.contact[]', 'option', 'email')}>E-mail</option>
		<option {...attrs('user.contact[]', 'option', 'letter')}>Letter</option>
	</select><br />
	<br />
	Consent to share details:<br />
	Yes:
	<input {...attrs('user.consent(boolean)', 'radio', true)} /><br />
	No:
	<input {...attrs('user.consent(boolean)', 'radio', false)} /><br />
	<br />
	Agree:<input {...attrs('do.you.agree(boolean)', 'checkbox', true)} /><br />
	<input type="submit" />
</form>
```



### Events using the `.listen` method

Lastly we need to register the events we want to listen to
e.g.
```ts
FF.listen('event', function(detail){
    //do something with detail
});
```

#### All events

- `values` - detail - is an object of all the form data in it's current state (no validation)
  
- `issues` - detail is zod issues in an object formatted structure
- `noPathIssues` - detail is zod issues with no path as an array of strngs
- `error` - detail is an error from save/submit
  
- `submitFormData` - detail - is FormData containing the form data which has passed validation
- `submitData` - detail - is an object containing the form data which has passed validation
- `submitting` - detail is a boolean based on whether a submit is occuring / finished
- `submitSuccess` - detail is boolean/undefined - true is submit was successfull, false if unsuccessfull, undefined if no current state. \
  If "submitSuccessTimeout" option is a number the value will return to undefined after x seconds. \
  If "submitSuccessTimeout" is 0 the value will remain the last set boolean.

- `autoSaveTimeLeft` - detail is a number representing seconds left before auto save is run
- `canSave` - detail is boolean based on whether there is data that is ready to be saved
- `saveData` - detail -  is an object containing the fragment data which has passed validation
- `saving` - detail is a boolean based on whether a save is occuring / finished
- `saveSuccess` - detail is boolean/undefined - true is save was successfull, false if unsuccessfull, undefined if no current state. \
  If "saveSuccessTimeout" option is a number the value will return to undefined after x seconds. \
  If "saveSuccessTimeout" is 0 the value will remain the last set boolean.
- `savedData` - detail - is an object of all data that has been saved previously

All the types for the event detail can be infered e.g. `values` type can be inferred using `typeof FF.types.values`

### Methods

- `.form(formEl)` - attaches the form element
- `.addEventListener()` - works like regular addEventListener except will queue any events before the form is attached and then adds events after
- `.cleanUp()` - cancels all timeouts and intervals and removes any evet listeners added with `.addEventListener()` method
- `.disabledAll()` - disables everything in the form
- `.enabledAll()` - enables everything that was dsiabled in the form (unless previously disabled)
- `.listen(event, callback)` - listen to custom events
- `.clear()` - clears all fields and resets issues
- `.fill(data)` - clears the form and populates form with data (only works on front end)
- `.cancelAutoSave()` - cancels autosave timers
- `.submitStart()` - disabled all form elements and let's FF know an attempt to submit the form is happening
- `.submitSuccess()` - enables everything, and FF will add the data to a ledger of previous saved data
- `.submitFailed()` - enables everything, but FF will not add data to a ledger
- `.saveStart()` - disabled all form elements and let's FF know an attempt to save is happening
- `.saveSuccess()` - enables everything, and FF will add the data to a ledger of previous saved data
- `.saveFailed()` - enables everything, but FF will not add data to a ledger
- `.issues(issues)` - (can also be for PE) add issues returned backend to FF, also returns issues formatted
- `.noPathIssues()` - (can also be for PE) get noPathIssues returned from the backend (must used after calling `.issues()`)
- `.error(error)` - (can also be for PE) set errors from backend




### Setting up form submission
Whilst FF doesn't actually get involved with form submission, we still need to let it know that it's happening so we can update the internal ledger.

#### Submitting form as object with types (using superjson)
```js
import { formToJSON } from 'fragment-forms';
import superjson from 'superjson';

const form = document.querySelector('form')
function submit() {
    // Here we are telling FF that we are now attempting to submit the form
    // This will disable all elements in the form
    // This will also cancel the autosave timer
    FF.submitStart(); 
    
    const response = fetch('/saveInfo', {
        method: 'POST',
        body: superjson.stringify( formToJSON(form) ),
        headers: {
            'Content-Type': 'application/json'
        }
    });

    response
        .then(async function (response) {
            console.log(await response.json());
            // Here we tell FF that the submission was successfull
            // FF will add the changes to the ledger of previous successfull changes
            // FF will also re-enable all elements
            FF.submitSuccess();
        })
        .catch(function () {
            // Here we tell FF to re-enable all elements
            // FF will not add the changes to the ledger of previous changes
            FF.submitFinally();
        });
}
form.onsubmit = submit;
```

### Setting up autosave
```js
const saveButton = document.querySelector("#save");
const FF = new FragmentForm(document.querySelector('form'), {
    debounceTimeout: 500, // Input debouncing, required as we don't want to be running expensive operations on every input event
    autosaveTimeout: 4000 // 0 (default) disables autosave. this should be a number greater than the option "debounceTimeout"
});
FF.autoSaveTimer(function (secondsRemaining) {
    // This function will be called every second until reaching 0
    console.log(secondsRemaining) // 4, 3, 2, 1
});
FF.autoSave(function ({ data, formData }) {
    // This function will be called when the timer reaches 0
    // data is the change as an object with types
    // formData is the changes as a FormData object
    // It is completely up to you if you wish to submit as FormData or the objetc (using something like superjson)
    save(formData);
});
FF.saveStatus(function (enabled) {
    // This function is called whenever there is/isn't any data to be saved
    // false - nothing to save (disable save button)
    // true - data to be saved (enable save button)
    saveButton.disabled = !enabled;
});
FF.fragmentOnInput(function ({ data, formData }, commit) {
    // On each input if autoSave is enabled, the timer is restarted
    // data is the change as an object with types
    // formData is the changes as a FormData object

    // It is completely up to you if you wish to submit as FormData or the object (using something like superjson)

    const dataIsValid = validation(data);
    if (dataIsValid) {
        commit(); // Here we are letting FF know that the data is OK and to commit it into an internal ledger
        saveButton.onclick = () => save(formData); // If the user wishes to save before the save timer they can
    } else {
        FF.cancelSave(); //Here we are telling FF that the data is erroneous and to cancel autosave
        saveButton.onclick = null // removing onclick listener
    }
});

function save(fragment: FormData) {
    // Here we are telling FF that we are now attempting to save the changes
    // This will disable all elements in the form
    // This will also cancel the autosave timer
    FF.saveStart(); 
    
    const response = fetch('/updateInfo', {
        method: 'POST',
        body: fragment
    });

    response
        .then(async function (response) {
            console.log(await response.json());
            // Here we tell FF that the save was successfull
            // FF will add the changes to the ledger of previous successfull changes
            // FF will also re-enable all elements
            FF.saveSuccess();
        })
        .catch(function () {
            // Here we tell FF to re-enable all elements
            // FF will not add the changes to the ledger of previous changes
            FF.saveFinally();
        });
}
```

Alternatively, if we wish to send changes as an object we can use something like superjson
```js
import superjson from 'superjson';

function save(fragment: object) {

    FF.saveStart(); 
    
    const response = fetch('/updateInfo', {
        method: 'POST',
        body: superjson.stringify(fragment),
        headers: {
            'Content-Type': 'application/json'
        }
    });

    response
        .then(async function (response) {
            console.log(await response.json());
            FF.saveSuccess();
        })
        .catch(function () {
            FF.saveFinally();
        });
}
```



### Cleaning up
Before removing the form from the view you should also run some cleanup for the `FF` object.
```JS
FF.cleanUp();
```
This will remove event listeners as well as clear any timeouts and intervals that were created by FF.



## Backend usage

The `POST` function used below is just for demonstrative purposes \
Adapt the `POST` function to your preferred JS framework's implementation for handling POST requests
### Form submission w/ progressive enhancement or fetch (using FormData)
```js
import { formToJSON } from 'fragment-forms';

async function POST(request){
    const formData = await request.formData();
    const data = formToJSON(formData);
    //Validate data -> data ok -> save to db
    //Error? -> return error to front end
}
```

### Form submission w/ fetch (using superjson)
```js
import superjson from 'superjson';

async function POST(request){
	const formText = await request.text();
	const data = superjson.parse(formText);
    //Validate data -> data ok -> save to db
    //Error? -> return error to front end
}
```

### Fragments w/ fetch (using FormData)
```js
import { formToJSON } from 'fragment-forms';

async function POST(request){
    const formData = await request.formData();
    const fragment = formToJSON(formData);
    //Validate fragment -> fragment ok -> update db
    //Error? -> return error to front end
}
```

### Fragments w/ fetch (using superjson)
```js
import superjson from 'superjson';

async function POST(request){
	const formText = await request.text();
	const fragment = superjson.parse(formText);
    //Validate fragment -> fragment ok -> update db
    //Error? -> return error to front end
}
```