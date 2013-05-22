var tasksTableTemplate = Handlebars.compile($('#tasks-table-template').html());

function runWhenJobLoaded() {
	if (typeof job != 'undefined' && job.loaded === true) {
		resetTasksTable();
		setInterval(updateJobStatusViews, 500);
		setInterval(updateJobNextRun, 500);
		setInterval(updateTasksTable, 500);
	} else {
		setTimeout(runWhenJobLoaded, 50);
	}
}

runWhenJobLoaded();

function bindEvents() {
	$('.task-delete').on('click', function() {
		$(this).parents('[data-task]').each(function() {
			deleteTask($(this).attr('data-task'));
		});
	});
}

function deleteTask(taskName) {

	if (!job.loaded) {
		return;
	}

	$.ajax({
		type: 'POST',
		url: $SCRIPT_ROOT + '/api/delete_task',
		data: {
			job_name: job.name,
			task_name: taskName
		},
		dataType: 'json',
		async: true,
		success: function() {
			job.update(function() {
				resetTasksTable();
				job.removeTaskFromGraph(taskName);
			});
			showAlert('table-alert', 'success', 'Task ' + taskName + ' deleted.');
		},
		error: function() {
			showAlert('table-alert', 'error', 'There was an error deleting the task.');
		},
		dataType: 'json'
	});

}

$('#add-task').click(function() {

	var newName = $('#new-task-name').val();
	var newCommand = $('#new-task-command').val();

	if (newName === null || newName === '') {
		showAlert('new-alert', 'error', 'Please enter a name for the new task.');
		return;
	}
	if (newCommand === null || newCommand === '') {
		showAlert('new-alert', 'error', 'Please enter a command for the new task.');
		return;
	}

	addNewTask(newName, newCommand);

});

function addNewTask(newName, newCommand) {

	if (!job.loaded) {
		return;
	}

	$.ajax({
		type: 'POST',
		url: $SCRIPT_ROOT + '/api/add_task_to_job',
		data: {
			job_name: job.name,
			task_name: newName,
			task_command: newCommand
		},
		dataType: 'json',
		success: function() {
			showAlert('new-alert', 'success', 'Task added to job.');
			job.update(function() {
				job.addTaskToGraph(newName);
				resetTasksTable();
			});
			$('#new-task-name').val('');
			$('#new-task-command').val('');
		},
		error: function() {
			showAlert('new-alert', 'error', 'There was an error adding the task to this job.');
		},
		async: true
	});

}

function resetTasksTable() {

	if (!job.loaded) {
		return;
	}

	$('#tasks-body').empty();

	for (var i = 0; i < job.tasks.length; i++) {
		var thisTask = job.tasks[i];
		$('#tasks-body').append(
			tasksTableTemplate({
				taskName: thisTask.name,
				taskURL: $SCRIPT_ROOT + '/job/' + job.id + '/' + thisTask.name
			})
		);
	}

	bindEvents();
	updateTasksTable();

}

function updateTasksTable() {

	if (!job.loaded) {
		return;
	}

	$('#tasks-body').children().each(function() {

		var taskName = $(this).attr('data-task');
		for (var i = 0; i < job.tasks.length; i++) {
			if (job.tasks[i].name === taskName) {
				var task = job.tasks[i];
				break;
			}
		}

		$(this).find('[data-attr]').each(function() {

			var attr = $(this).attr('data-attr');
			var transform = $(this).attr('data-transform');

			$(this).text('');
			if (task[attr] !== null) {
				$(this).text(task[attr]);
			}

			if (typeof transform === 'undefined' || transform === false) {
				// no transform attribute
			} else {
				applyTransformation($(this), task[attr], transform);
			}

		});

	});

}

function updateJobStatusViews() {

	if (!job.loaded) {
		return;
	}

	setControlButtonStates();
	$('#job-status')
		.removeClass('status-waiting status-running status-failed')
		.addClass('status-' + job.status)
		.text(toTitleCase(job.status));

}

function setControlButtonStates() {
	// disable control buttons based on current job state

	if (!job.loaded) {
		return;
	}

	$('#start-job').prop('disabled', false);
	$('#retry-job').prop('disabled', false);
	$('#terminate-job').prop('disabled', false);
	$('#kill-job').prop('disabled', false);

	if (job.status == 'waiting') {
		$('#terminate-job').prop('disabled', true);
		$('#kill-job').prop('disabled', true);
	} else if (job.status == 'running') {
		$('#start-job').prop('disabled', true);
		$('#retry-job').prop('disabled', true);
	} else if (job.status == 'failed') {
		$('#terminate-job').prop('disabled', true);
		$('#kill-job').prop('disabled', true);
	}

}

function updateJobNextRun() {

	job.update(function() {
		$('#next-run').val(moment.utc(job.next_run).local().format('LLL'));
	});

}

$('#save-schedule').click(function() {

	if (!job.loaded) {
		return;
	}

	$.ajax({
		type: 'POST',
		url: $SCRIPT_ROOT + '/api/schedule_job',
		data: {
			job_name: job.name,
			cron_schedule: $('#cron-schedule').val()
		},
		dataType: 'json',
		success: function () {
			showAlert('schedule-alert', 'success', 'Job scheduled successfully');
			updateJobNextRun();
		},
		error: function() {
			showAlert('schedule-alert', 'error', 'Unable to schedule job');
		},
		async: true
	});

});

$('#start-job').click(function() {

	if (!job.loaded) {
		return;
	}

	$.ajax({
		type: 'POST',
		url: $SCRIPT_ROOT + '/api/start_job',
		data: {job_name: job.name},
		dataType: 'json',
		success: function() {
			showAlert('state-alert', 'success', 'Job started');
		},
		error: function() {
			showAlert('state-alert', 'error', 'Unable to start job');
		},
		async: true
	});

});

$('#retry-job').click(function() {

	if (!job.loaded) {
		return;
	}

	$.ajax({
		type: 'POST',
		url: $SCRIPT_ROOT + '/api/retry_job',
		data: {job_name: job.name},
		dataType: 'json',
		success: function() {
			showAlert('state-alert', 'success', 'Retrying job from previous state');
		},
		error: function() {
			showAlert('state-alert', 'error', 'Unable to retry job');
		},
		async: true
	});

});

$('#terminate-job').click(function() {

	if (!job.loaded) {
		return;
	}

	$.ajax({
		type: 'POST',
		url: $SCRIPT_ROOT + '/api/terminate_all_tasks',
		data: {job_name: job.name},
		dataType: 'json',
		success: function() {
			showAlert('state-alert', 'success', 'All running tasks terminated');
		},
		error: function() {
			showAlert('state-alert', 'error', 'Unable to terminate some or all tasks');
		},
		async: true
	});

});

$('#kill-job').click(function() {

	if (!job.loaded) {
		return;
	}

	$.ajax({
		type: 'POST',
		url: $SCRIPT_ROOT + '/api/kill_all_tasks',
		data: {job_name: job.name},
		dataType: 'json',
		success: function() {
			showAlert('state-alert', 'success', 'All running tasks killed');
		},
		error: function() {
			showAlert('state-alert', 'error', 'Unable to kill some or all tasks');
		},
		async: true
	});

});