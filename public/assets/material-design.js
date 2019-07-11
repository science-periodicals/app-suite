document.addEventListener('DOMContentLoaded', function(){
  document.body.addEventListener('blur', function(e){
    if(e.target.tagName === 'INPUT'){
      // check if the input has any value (if we've typed into it)
      if (e.target.value) {
        e.target.classList.add('dirty');
      } else {
        e.target.classList.remove('dirty');
      }
    }
  }, true); //focusout does not bubble up => usCapture: true
});
