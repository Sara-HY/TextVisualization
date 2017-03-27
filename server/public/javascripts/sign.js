$(function(){
	$("#sign-up").click(function(){
		$("#sign-up-bar").css('display', 'block');
		$("#sign-in-bar").css('display', 'none');
		$("#sign-up-form").css('display', 'block');
		$("#sign-in-form").css('display', 'none');
	});
});

$(function(){
	$("#sign-in").click(function(){
		$("#sign-in-bar").css('display', 'block');
		$("#sign-up-bar").css('display', 'none');
		$("#sign-in-form").css('display', 'block');
		$("#sign-up-form").css('display', 'none');
	});
});


$(function(){ 
	$("#signIn").click(function(){ 
		var username = $("#in-username").val();
		var password = $("#in-password").val();
		var data = {"signType":"signin", "userName":username, "userPwd":password};
		$.ajax({ 
			url:'/',
			type:'post',
			data: data,
			success: function(data, status){ 
				if(status == 'success'){ 
					console.log("yes");
					location.href = 'datasystem/upload';
				}
			},
			error: function(data, status){ 
				if(status == 'error'){ 
					location.href = '/';
				}
			}
		});
	});
});

$(function(){
	$("#SignUp").click(function(){ 
		var username = $("#up-username").val();
		var password = $("#up-password").val();
		var retypePassword = $("#retype-password").val();
		if(password !== retypePassword){ 
			$("#password").css("border","1px solid red");
			$("#retype-password").css("border","1px solid red");
		}else if(password === retypePassword){
			var data = {"signType":"signup", "userName":username, "userPwd":password};
			$.ajax({ 
				url: '/',
				type: 'post',
				data: data,
				success: function(data,status){ 
					if(status == 'success'){ 
						location.href = '/';
					}
				},
				error: function(data,err){ 
					location.href = '/';
					$("#sign-up").click();
				}
			}); 
		}
	})
});