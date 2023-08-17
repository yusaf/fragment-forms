# Fragment Forms 

Fragment forms **is framework agnostic** and can be used as is, however was designed to be used as a scaffolding to build framework specific libraries.

Fragment forms is a new approach to form handling by taking advantage of the name attribute with a few naming conventions! 

Fragment forms offers:
- Form submissions - with support for progressive enhancement and form re-population.
- FormData to object with types coerced -  FormData is converted to an object with types coersed to `numbers`, `booleans` and `date`.
- Autosaving form changes - changes are only saved when there's an **ACTUAL** change to the form.
- Form change fragments - only the fields that changed get submitted and not the entire form.
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

is converted on the backend to
```js
import { formToJSON } from 'fragment-forms';

async function POST(request){
    const formData = await request.formData();
    const data = formToJSON(formData);

    // below is an example for the const data 
    const data = {
        name: {
            first:"Yusaf",
            last:"Khaliq"
        }
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
    Agree to storing your data: <input name="agree(boolean)" type="checkbox" value="1"><br>
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
    agree: true // A value of "0" is considered false, "1" is true
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

Now let's add the always include prefix (`_$`) to our hidden input's name, changing from `"children[1].id"` to `name="children[1]._$id"`

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

The always prefix works for all direct ancestors too! \
And, it is also possible to include entire arrays by prefixing the square brackets like `_$[index]` \

e.g. let's also add a  hidden input with the name `"_$parentId"`.

```html
<form method="POST">
    <input name="_$parentId" value="parent-random-uuid" type="hidden" /><br />

	Child 1 <input name="children_$[0].id" value="child-1-random-uuid" type="hidden" /><br />
	First name:<input name="children_$[0].name.first" value="Emily" /><br />
	Last name:<input name="children_$[0].name.last" value="Brown" /><br />
	Sex: Male<input name="children_$[0].sex" value="male" type="radio" /> Female<input
		name="children_$[0].sex"
		value="female"
		type="radio"
		checked
	/>
	<br />
	Child 2 <input name="children_$[1].id" value="child-2-random-uuid" type="hidden" /><br />
	First name:<input name="children_$[1].name.first" value="Bobby" /><br />
	Last name:<input name="children_$[1].name.last" value="Brown" /><br />
	Sex: Male<input name="children_$[1].sex" value="male" type="radio" checked /> Female<input
		name="children_$[1].sex"
		value="female"
		type="radio"
	/>
	<br />
	<input type="submit" />
</form>
```
When a a single change is made now to any of the "children" fields the fragment will look like:
```js
const fragment = {
    parentId:"parent-random-uuid",
    children:[
    {
        id: "child-1-random-uuid",
        name: {first:"Emily", last:"Brown"},
        sex:"female"
    },
    {
        id: "child-2-random-uuid",
        name: {first:"Bobby", last:"Smith"},
        sex:"female"
    }
   ]
}
```