(function(root){
 'use strict';
 const domain='accounts.fragrance-library.invalid';
 function normalize(value){const username=String(value||'').trim().toLowerCase();if(!/^[a-z][a-z0-9_]{2,23}$/.test(username))throw Error('Use 3–24 characters: start with a letter, then letters, numbers or underscores.');return username;}
 function credentials(value,password,confirmation,signup=false){const username=normalize(value);if(typeof password!=='string'||!password.length)throw Error('Enter your password.');if(signup&&password.length<12)throw Error('Use a password with at least 12 characters.');if(signup&&password!==confirmation)throw Error('Passwords do not match.');return {email:username+'@'+domain,password,options:{data:{username}}};}
 function display(user){const email=user?.email||'';return email.endsWith('@'+domain)?email.split('@')[0]:email;}
 const api={normalize,credentials,display};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.UsernameAuth=api;
})(typeof globalThis!=='undefined'?globalThis:this);
